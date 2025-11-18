import { useState, useCallback, useRef, useEffect } from "react";
import {
  createAirConditioner,
  updateAirConditionerAnimation,
  toggleAirConditioner,
} from "../utils/createAirConditioner";
import { snapToGrid } from "../utils/doorUtils";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import { isValidWindowPosition } from "../utils/windowUtils";
import {
  isDoorWindowOverlapping,
  isHeaterBlockingWindow,
  isHeaterBlockingAC,
} from "../utils/overlapUtils";
import { isACOverlappingAC } from "../utils/overlapUtils";
import { DOOR_CONFIG, WINDOW_CONFIG } from "../config/sceneConfig";

export const useAirConditioners = (scene) => {
  const [acs, setAcs] = useState([]);
  const acObjectsRef = useRef(new Map());

  const addAirConditioner = useCallback(
    ({ position, direction }) => {
      if (!scene) return null;
      const snapped = snapToGrid({ x: position.x, z: position.z });
      const id = `ac_${Date.now()}`;
      const ac = createAirConditioner({
        position: { x: snapped.x, z: snapped.z },
        direction,
        id,
      });
      if (!ac) return null;
      scene.add(ac);
      acObjectsRef.current.set(id, ac);
      setAcs((prev) => [
        ...prev,
        { id, position: { x: snapped.x, z: snapped.z }, direction },
      ]);
      // store basePosition inside userData for movement/revert helpers
      try {
        ac.userData.basePosition = { x: snapped.x, z: snapped.z };
      } catch (e) {}
      return ac;
    },
    [scene]
  );

  const removeAirConditioner = useCallback(
    (acId) => {
      if (!scene) return;
      const obj = scene.children.find(
        (c) =>
          c.userData && c.userData.type === "aircon" && c.userData.id === acId
      );
      if (obj) scene.remove(obj);
      if (acObjectsRef.current.has(acId)) acObjectsRef.current.delete(acId);
      setAcs((prev) => prev.filter((a) => a.id !== acId));
    },
    [scene]
  );

  const toggleAirConditionerState = useCallback(
    (acId) => {
      if (!scene) return;
      const obj =
        acObjectsRef.current.get(acId) ||
        scene.children.find(
          (c) =>
            c.userData && c.userData.type === "aircon" && c.userData.id === acId
        );
      if (obj) {
        toggleAirConditioner(obj);
      }
    },
    [scene]
  );

  const updateACPositionInState = useCallback((id, pos) => {
    setAcs((prev) =>
      prev.map((a) => (a.id === id ? { ...a, position: pos } : a))
    );
    const obj = acObjectsRef.current.get(id);
    if (obj) {
      const prevBase = obj.userData.basePosition || {
        x: obj.position.x,
        z: obj.position.z,
      };
      if (typeof obj.onMove === "function") {
        obj.onMove(prevBase, pos);
      } else {
        const inset =
          HOUSE_CONFIG.wallThickness / 2 + (obj.userData?.depth || 0.75) / 2;
        const yPos = 2;
        obj.position.set(pos.x, yPos, pos.z);
        if (obj.userData.direction === "north") obj.position.z += inset;
        else if (obj.userData.direction === "south") obj.position.z -= inset;
        else if (obj.userData.direction === "east") obj.position.x -= inset;
        else if (obj.userData.direction === "west") obj.position.x += inset;
      }
      obj.userData.basePosition = { x: pos.x, z: pos.z };
    }
  }, []);

  const previewMoveAircon = useCallback(
    (acId, newBasePos) => {
      const obj =
        acObjectsRef.current.get(acId) ||
        scene.children.find(
          (c) =>
            c.userData && c.userData.type === "aircon" && c.userData.id === acId
        );
      if (!obj) return false;

      const base = obj.userData.basePosition || {
        x: obj.position.x,
        z: obj.position.z,
      };
      const dir = obj.userData.direction;
      const isNS = dir === "north" || dir === "south";
      const adjusted = {
        x: isNS ? newBasePos.x : base.x,
        z: isNS ? base.z : newBasePos.z,
      };
      const snapped = snapToGrid(adjusted);

      const ok =
        typeof obj.moveTo === "function"
          ? obj.moveTo(snapped, {
              validate: false,
              snap: true,
              instant: true,
            })
          : false;

      if (ok) {
        const p = obj.toInfo().position;
        updateACPositionInState(acId, p);
      }
      return ok;
    },
    [scene, updateACPositionInState]
  );

  const commitMoveAircon = useCallback(
    (
      acId,
      finalBasePos,
      { doors = [], windows = [], heaters = [], acs: otherAcs = [] } = {}
    ) => {
      const obj =
        acObjectsRef.current.get(acId) ||
        scene.children.find(
          (c) =>
            c.userData && c.userData.type === "aircon" && c.userData.id === acId
        );
      if (!obj) return false;

      const base = obj.userData.basePosition || {
        x: obj.position.x,
        z: obj.position.z,
      };
      const dir = obj.userData.direction;
      const isNS = dir === "north" || dir === "south";
      const adjustedFinal = snapToGrid({
        x: isNS ? finalBasePos.x : base.x,
        z: isNS ? base.z : finalBasePos.z,
      });

      const candidate = {
        position: adjustedFinal,
        direction: obj.userData.direction,
      };

      const validPos = isValidWindowPosition({
        ...adjustedFinal,
        direction: obj.userData.direction,
      });

      if (!validPos) {
        if (typeof obj.revertPosition === "function") obj.revertPosition();
        return false;
      }

      const acHalf = (obj.userData?.width || 2.5) / 2;
      const acCenter = isNS ? adjustedFinal.x : adjustedFinal.z;

      const doorHalf = (DOOR_CONFIG.width || 1.5) / 2;
      const windowHalf = (WINDOW_CONFIG.width || 2) / 2;

      const doorConflict = (doors || []).some((d) => {
        if (!d || d.direction !== dir) return false;
        const center = isNS ? d.position.x : d.position.z;
        return Math.abs(center - acCenter) < doorHalf + acHalf;
      });

      const windowConflict = (windows || []).some((w) => {
        if (!w || w.direction !== dir) return false;
        const center = isNS ? w.position.x : w.position.z;
        return Math.abs(center - acCenter) < windowHalf + acHalf;
      });

      const heaterConflict = (heaters || []).some((h) =>
        isHeaterBlockingAC(h.position, candidate)
      );

      const acConflict = (otherAcs || []).some((a) => {
        return isACOverlappingAC(a, {
          id: acId,
          position: adjustedFinal,
          direction: dir,
        });
      });

      if (doorConflict || windowConflict || heaterConflict || acConflict) {
        if (typeof obj.revertPosition === "function") obj.revertPosition();
        return false;
      }

      const ok =
        typeof obj.moveTo === "function"
          ? obj.moveTo(adjustedFinal, { validate: false, snap: true })
          : false;

      if (ok) {
        const p = obj.toInfo().position;
        updateACPositionInState(acId, p);
        obj.userData.basePosition = { x: p.x, z: p.z };
        return true;
      }

      if (typeof obj.revertPosition === "function") obj.revertPosition();
      return false;
    },
    [scene, updateACPositionInState]
  );

  const clearAllACs = useCallback(() => {
    if (!scene) return;
    for (const obj of acObjectsRef.current.values()) {
      scene.remove(obj);
    }
    acObjectsRef.current.clear();
    setAcs([]);
  }, [scene]);

  const updateAnimations = useCallback(() => {
    for (const a of acObjectsRef.current.values()) {
      updateAirConditionerAnimation(a);
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
    acs,
    addAirConditioner,
    removeAirConditioner,
    toggleAirConditionerState,
    updateACPositionInState,
    clearAllACs,
    previewMoveAircon,
    commitMoveAircon,
  };
};
