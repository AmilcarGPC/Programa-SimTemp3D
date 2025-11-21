import { useState, useRef, useCallback, useEffect } from "react";

/*
  useEntities: Hook genérico para manejar entidades basadas en EntityBase.

  Options:
    - type: string (informativo)
    - createEntity: (data) => THREE.Object3D (debe extender EntityBase)
    - toStateInfo?: (entity) => { id, position, direction }
    - onAdd?: (entity, data, ctx) => void  // setValidator, onMove, etc.
    - onRemove?: (entity) => void
    - positionMapper?: (statePos, entity) => void // aplicar inset/offsets a entity.position
    - extraCommitValidation?: (candidate, world, ctx) => boolean
    - initialState?: []

  Exporta:
    - items, addItem, removeItem, toggleItem, updateItemPositionInState
    - previewMoveItem(id, newBasePos)
    - commitMoveItem(id, finalBasePos, world)
    - clearAllItems
*/

export const useEntities = (scene, options = {}) => {
  const {
    type = "entity",
    createEntity,
    toStateInfo = (e) =>
      typeof e.toInfo === "function" ? e.toInfo() : { id: e.userData?.id },
    onAdd,
    onRemove,
    positionMapper,
    extraCommitValidation,
    beforeCreate,
    getWorld,
    initialState = [],
  } = options;

  const [items, setItems] = useState(initialState);
  const objectsRef = useRef(new Map());
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const addItem = useCallback(
    (data = {}) => {
      if (!scene) return null;
      if (typeof createEntity !== "function") return null;
      console.log("LOOG", data);
      const ent = createEntity(data);
      if (!ent) return null;
      scene.add(ent);
      const id = ent.userData?.id;
      if (id) objectsRef.current.set(id, ent);
      const info = toStateInfo(ent);
      setItems((prev) => [...prev, info]);
      if (typeof onAdd === "function") onAdd(ent, data, { scene, setItems });
      return ent;
    },
    [scene, createEntity, onAdd, toStateInfo]
  );

  const removeItem = useCallback(
    (id) => {
      if (!scene) return;
      const obj =
        objectsRef.current.get(id) ||
        scene.children.find(
          (c) => c.userData && c.userData.type === type && c.userData.id === id
        );
      if (obj) {
        if (typeof onRemove === "function") onRemove(obj);
        if (typeof obj.dispose === "function") obj.dispose();
        scene.remove(obj);
      }
      if (objectsRef.current.has(id)) objectsRef.current.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [scene, onRemove, type]
  );

  const toggleItem = useCallback(
    (id) => {
      if (!scene) return;
      const obj =
        objectsRef.current.get(id) ||
        scene.children.find(
          (c) => c.userData && c.userData.type === type && c.userData.id === id
        );
      if (obj && typeof obj.toggle === "function") {
        obj.toggle();
        // Sync state after toggle
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? toStateInfo(obj) : item
          )
        );
      }
    },
    [scene, type, toStateInfo]
  );

  const updateItemPositionInState = useCallback((id, pos) => {
    const obj = objectsRef.current.get(id);
    // First apply mapping to the actual object (entity-driven if possible)
    if (obj) {
      const prevBase = obj.userData.basePosition || {
        x: obj.position.x,
        z: obj.position.z,
      };
      if (typeof obj.onMove === "function") {
        try {
          console.log("UIPS", id, pos, prevBase);
          obj.onMove(prevBase, pos);
        } catch (e) { }
      } else if (typeof positionMapper === "function") {
        positionMapper(pos, obj);
      } else {
        // default behaviour: place at base pos, keep current y
        const y = obj.position.y || 0;
        obj.position.set(pos.x, y, pos.z);
      }
      obj.userData.basePosition = { x: pos.x, z: pos.z };
      // Prefer entity-provided canonical position for state if available
      const canonical =
        typeof obj.toInfo === "function"
          ? obj.toInfo().position
          : { x: pos.x, z: pos.z };
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, position: canonical } : it))
      );
    } else {
      // fallback: update state only
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, position: pos } : it))
      );
    }
  }, []);

  const previewMoveItem = useCallback(
    (id, newBasePos) => {
      const obj =
        objectsRef.current.get(id) ||
        scene.children.find(
          (c) => c.userData && c.userData.type === type && c.userData.id === id
        );
      if (!obj) return false;
      // Run local validation (grid / entity-specific) even for previews.
      // This prevents previews from showing when the candidate is locally invalid
      // (e.g., AC outside wall bounds) while still avoiding global/world checks.
      const snapped = {
        x: Math.round(newBasePos.x),
        z: Math.round(newBasePos.z),
      };
      if (typeof obj.validatePosition === "function") {
        try {
          const localOk = obj.validatePosition(null, snapped);
          if (!localOk) return false;
        } catch (e) {
          // On validator error, block preview
          return false;
        }
      }

      const ok =
        typeof obj.moveTo === "function"
          ? obj.moveTo(newBasePos, {
            validate: false,
            snap: true,
            instant: true,
          })
          : false;
      if (ok) {
        const p =
          typeof obj.toInfo === "function"
            ? obj.toInfo().position
            : obj.position;
        updateItemPositionInState(id, p);
      }
      return ok;
    },
    [scene, type, updateItemPositionInState]
  );

  const commitMoveItem = useCallback(
    (id, finalBasePos, world = {}) => {
      const obj =
        objectsRef.current.get(id) ||
        scene.children.find(
          (c) => c.userData && c.userData.type === type && c.userData.id === id
        );
      if (!obj) return false;

      // build candidate for external checks
      const candidate = {
        id,
        position: finalBasePos,
        direction: obj.userData?.direction,
      };

      if (typeof extraCommitValidation === "function") {
        const okCustom = extraCommitValidation(candidate, world, {
          objectsRef,
          itemsRef,
        });
        if (!okCustom) {
          if (typeof obj.revertPosition === "function") obj.revertPosition();
          return false;
        }
      }

      const ok =
        typeof obj.moveTo === "function"
          ? obj.moveTo(finalBasePos, { validate: true, world })
          : false;

      if (ok) {
        const p =
          typeof obj.toInfo === "function"
            ? obj.toInfo().position
            : finalBasePos;
        updateItemPositionInState(id, p);
        obj.userData.basePosition = { x: p.x, z: p.z };
        return true;
      }

      if (typeof obj.revertPosition === "function") obj.revertPosition();
      return false;
    },
    [scene, type, extraCommitValidation, updateItemPositionInState]
  );

  const clearAllItems = useCallback(() => {
    if (!scene) return;
    for (const obj of objectsRef.current.values()) {
      if (typeof obj.dispose === "function") obj.dispose();
      scene.remove(obj);
    }
    objectsRef.current.clear();
    setItems([]);
  }, [scene]);

  const updateAnimations = useCallback(() => {
    for (const obj of objectsRef.current.values()) {
      if (typeof obj.updateAnimation === "function") obj.updateAnimation();
    }
  }, []);

  useEffect(() => {
    let id;
    const loop = () => {
      updateAnimations();
      id = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(id);
  }, [updateAnimations]);

  return {
    items,
    addItem,
    removeItem,
    toggleItem,
    updateItemPositionInState,
    previewMoveItem,
    commitMoveItem,
    clearAllItems,
    objectsRef,
  };
};

export default useEntities;
