import { useState, useCallback, useRef, useEffect } from "react";
import {
  createHeater,
  updateHeaterAnimation,
  toggleHeater,
} from "../utils/createHeater";
import { snapToGrid } from "../utils/doorUtils";

export const useHeaters = (scene) => {
  const [heaters, setHeaters] = useState([]);
  const heaterObjectsRef = useRef(new Map());

  const addHeater = useCallback(
    (position) => {
      if (!scene) return null;
      // Ensure the heater is placed on the grid and at floor level
      const snapped = snapToGrid({ x: position.x, z: position.z });
      const id = `heater_${Date.now()}`;
      const heater = createHeater({
        position: { x: snapped.x, z: snapped.z },
        id,
      });
      // Orient heater to face center (0,0) so its front always points inward
      try {
        const raw = Math.atan2(-heater.position.x, -heater.position.z);
        const step = Math.PI / 2; // 90 degrees
        const quant = Math.round(raw / step) * step;
        heater.rotation.y = quant;
      } catch (e) {
        // defensive: if heater is null or unexpected, ignore
      }
      scene.add(heater);
      heaterObjectsRef.current.set(id, heater);
      // Log the created heater world position for debugging
      console.log("🔥 addHeater creado en:", {
        id,
        x: heater.position.x,
        y: heater.position.y,
        z: heater.position.z,
      });
      setHeaters((prev) => [
        ...prev,
        { id, position: { x: snapped.x, z: snapped.z } },
      ]);
      return heater;
    },
    [scene]
  );

  const removeHeater = useCallback(
    (heaterId) => {
      if (!scene) return;
      const heaterObj = scene.children.find(
        (c) =>
          c.userData &&
          c.userData.type === "heater" &&
          c.userData.id === heaterId
      );
      if (heaterObj) scene.remove(heaterObj);
      if (heaterObjectsRef.current.has(heaterId))
        heaterObjectsRef.current.delete(heaterId);
      setHeaters((prev) => prev.filter((h) => h.id !== heaterId));
    },
    [scene]
  );

  const toggleHeaterState = useCallback(
    (heaterId) => {
      if (!scene) return;
      const heaterObj =
        heaterObjectsRef.current.get(heaterId) ||
        scene.children.find(
          (c) =>
            c.userData &&
            c.userData.type === "heater" &&
            c.userData.id === heaterId
        );
      if (heaterObj) {
        toggleHeater(heaterObj);
      }
    },
    [scene]
  );

  const updateHeaterPositionInState = useCallback((heaterId, newPos) => {
    setHeaters((prev) =>
      prev.map((h) => (h.id === heaterId ? { ...h, position: newPos } : h))
    );
  }, []);

  const clearAllHeaters = useCallback(() => {
    if (!scene) return;
    for (const obj of heaterObjectsRef.current.values()) {
      scene.remove(obj);
    }
    heaterObjectsRef.current.clear();
    setHeaters([]);
  }, [scene]);

  const updateAnimations = useCallback(() => {
    for (const h of heaterObjectsRef.current.values()) {
      updateHeaterAnimation(h);
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
    heaters,
    addHeater,
    removeHeater,
    toggleHeaterState,
    updateHeaterPositionInState,
    clearAllHeaters,
  };
};
