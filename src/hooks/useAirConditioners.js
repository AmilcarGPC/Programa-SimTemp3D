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
        try {
          toggleAirConditioner(obj);
        } catch (e) {
          console.warn("toggleAirConditioner failed", e);
        }
      }
    },
    [scene]
  );

  const updateACPositionInState = useCallback((id, pos) => {
    console.debug("updateACPositionInState called", { id, pos });
    setAcs((prev) =>
      prev.map((a) => (a.id === id ? { ...a, position: pos } : a))
    );
    // Also update the scene object position (apply inset and fixed height)
    const obj = acObjectsRef.current.get(id);
    if (obj) {
      try {
        const prevBase = obj.userData.basePosition || {
          x: obj.position.x,
          z: obj.position.z,
        };
        if (typeof obj.onMove === "function") {
          obj.onMove(prevBase, pos);
        } else {
          // fallback: set world position using wall half-thickness + half AC depth
          const inset =
            HOUSE_CONFIG.wallThickness / 2 + (obj.userData?.depth || 0.75) / 2;
          const yPos = 2;
          obj.position.set(pos.x, yPos, pos.z);
          if (obj.userData.direction === "north") obj.position.z += inset;
          else if (obj.userData.direction === "south") obj.position.z -= inset;
          else if (obj.userData.direction === "east") obj.position.x -= inset;
          else if (obj.userData.direction === "west") obj.position.x += inset;
        }
        // store basePosition for future moves
        obj.userData.basePosition = { x: pos.x, z: pos.z };
        console.debug("updateACPositionInState applied to scene obj", {
          id,
          worldPos: obj.position,
          basePosition: obj.userData.basePosition,
        });
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Preview move: snap and move visually without global validation
  const previewMoveAircon = useCallback(
    (acId, newBasePos) => {
      const obj =
        acObjectsRef.current.get(acId) ||
        scene.children.find(
          (c) =>
            c.userData && c.userData.type === "aircon" && c.userData.id === acId
        );
      if (!obj) return false;
      try {
        console.debug("previewMoveAircon", { acId, newBasePos });
        // When dragging along a wall we must preserve the wall-fixed axis
        // (doors/windows do this). For north/south walls keep z fixed,
        // for east/west keep x fixed. Use the stored basePosition as the
        // locked coordinate if available.
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
        console.debug("previewMoveAircon moveTo returned", { acId, ok });
        if (ok) {
          const p = obj.toInfo().position;
          console.debug("previewMoveAircon will update state pos", { acId, p });
          updateACPositionInState(acId, p);
        }
        return ok;
      } catch (e) {
        console.error("previewMoveAircon error", e);
        return false;
      }
    },
    [scene, updateACPositionInState]
  );

  // Commit move: validate collisions against provided world context and persist or revert
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
      // basic validation: must be on a valid wall edge
      // Adjust finalBasePos to lock the wall-fixed axis (same behavior as doors/windows)
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
      console.debug("commitMoveAircon start", {
        acId,
        originalFinal: finalBasePos,
        finalBase: adjustedFinal,
        direction: obj.userData.direction,
      });
      try {
        // check position validity using window/door rules
        const validPos = isValidWindowPosition({
          ...adjustedFinal,
          direction: obj.userData.direction,
        });
        console.debug("commitMoveAircon validPos", { validPos });
        if (!validPos) {
          console.debug("commitMoveAircon invalid position, reverting", {
            acId,
            finalBasePos: adjustedFinal,
          });
          if (typeof obj.revertPosition === "function") obj.revertPosition();
          return false;
        }

        // Check overlaps with doors and windows using widths (AC has its own width)
        const acHalf = (obj.userData?.width || 2.5) / 2;
        const acCenter = isNS ? adjustedFinal.x : adjustedFinal.z;

        // doors
        const doorHalf = (DOOR_CONFIG.width || 1.5) / 2;
        const windowHalf = (WINDOW_CONFIG.width || 2) / 2;

        const doorConflict = (doors || []).some((d) => {
          if (!d || d.direction !== dir) return false;
          const center = isNS ? d.position.x : d.position.z;
          const overlap = Math.abs(center - acCenter) < doorHalf + acHalf;
          if (overlap)
            console.debug("commitMoveAircon door overlap", { d, acId });
          return overlap;
        });

        const windowConflict = (windows || []).some((w) => {
          if (!w || w.direction !== dir) return false;
          const center = isNS ? w.position.x : w.position.z;
          const overlap = Math.abs(center - acCenter) < windowHalf + acHalf;
          if (overlap)
            console.debug("commitMoveAircon window overlap", { w, acId });
          return overlap;
        });

        const heaterConflict = (heaters || []).some((h) =>
          isHeaterBlockingAC(h.position, candidate)
        );

        // AC vs AC conflict: check existing ACs (exclude self)
        const acConflict = (otherAcs || []).some((a) => {
          try {
            // a may be stored as {id, position, direction} in state
            return isACOverlappingAC(a, {
              id: acId,
              position: adjustedFinal,
              direction: dir,
            });
          } catch (e) {
            return false;
          }
        });

        console.debug("commitMoveAircon conflicts", {
          doorConflict,
          windowConflict,
          heaterConflict,
          acConflict,
        });

        if (doorConflict || windowConflict || heaterConflict || acConflict) {
          console.debug("commitMoveAircon conflicts detected, reverting", {
            doorConflict,
            windowConflict,
            heaterConflict,
            acConflict,
          });
          if (typeof obj.revertPosition === "function") obj.revertPosition();
          return false;
        }

        // commit final position
        console.debug("commitMoveAircon attempting moveTo", {
          acId,
          finalBasePos: adjustedFinal,
        });
        const ok =
          typeof obj.moveTo === "function"
            ? obj.moveTo(adjustedFinal, { validate: false, snap: true })
            : false;
        console.debug("commitMoveAircon moveTo returned", { acId, ok });
        if (ok) {
          const p = obj.toInfo().position;
          console.debug("commitMoveAircon committing position", { acId, p });
          updateACPositionInState(acId, p);
          // store basePosition on the object for future moves
          obj.userData.basePosition = { x: p.x, z: p.z };
          return true;
        }
        console.debug("commitMoveAircon moveTo failed, reverting", { acId });
        if (typeof obj.revertPosition === "function") obj.revertPosition();
        return false;
      } catch (e) {
        try {
          if (typeof obj.revertPosition === "function") obj.revertPosition();
        } catch (e) {}
        console.error("commitMoveAircon error", e);
        return false;
      }
    },
    [scene, updateACPositionInState]
  );

  const clearAllACs = useCallback(() => {
    if (!scene) return;
    acObjectsRef.current.forEach((obj) => {
      try {
        scene.remove(obj);
      } catch (e) {
        console.warn("useAirConditioners: error removing ac from scene", e);
      }
    });
    acObjectsRef.current.clear();
    setAcs([]);
  }, [scene]);

  const updateAnimations = useCallback(() => {
    acObjectsRef.current.forEach((a) => {
      try {
        updateAirConditionerAnimation(a);
      } catch (e) {
        // ignore
      }
    });
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
