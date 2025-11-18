import { useState, useCallback, useEffect, useRef } from "react";
import {
  createDoor,
  applyDoorCutouts,
  updateDoorAnimation,
  toggleDoor,
} from "../utils/createDoor";
import { isValidDoorPosition } from "../utils/doorUtils";

/**
 * Hook personalizado para gestionar el sistema de puertas
 * @param {THREE.Scene} scene - La escena de Three.js
 * @param {THREE.Mesh} wallsMesh - El mesh de las paredes
 * @returns {Object} Métodos y estado para gestionar puertas
 */
export const useDoors = (scene, wallsMesh) => {
  const [doors, setDoors] = useState([]);
  const [placementMode, setPlacementMode] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState("north");
  const doorObjectsRef = useRef(new Map());
  const doorsRef = useRef(doors);

  useEffect(() => {
    doorsRef.current = doors;
  }, [doors]);

  const addDoor = useCallback(
    (position, direction) => {
      console.log("🚪 addDoor llamado con:", {
        position,
        direction,
        scene: !!scene,
        wallsMesh: !!wallsMesh,
      });

      if (!scene || !wallsMesh) {
        console.warn("❌ No hay scene o wallsMesh");
        return null;
      }

      if (!isValidDoorPosition({ ...position, direction })) {
        console.warn("❌ Posición inválida para la puerta");
        return null;
      }

      const tooClose = doors.some((door) => {
        const dx = door.position.x - position.x;
        const dz = door.position.z - position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return distance < 2.5;
      });

      if (tooClose) {
        console.warn("❌ Ya hay una puerta muy cerca");
        return null;
      }

      const doorId = `door_${Date.now()}`;
      const doorData = { position, direction, id: doorId };

      console.log("✅ Validación pasada, creando puerta:", doorData);

      const doorObject = createDoor(doorData);
      if (!doorObject) {
        console.warn("❌ createDoor devolvió null");
        return null;
      }

      if (typeof doorObject.setValidator === "function") {
        doorObject.setValidator((entity, ctx) => {
          if (typeof entity.validatePosition === "function") {
            const okLocal = entity.validatePosition(
              ctx.world,
              ctx.basePosition
            );
            if (!okLocal) return false;
          }

          const others = (doorsRef.current || []).filter(
            (d) => d.id !== entity.userData.id
          );
          for (const od of others) {
            const dx = od.position.x - (ctx.basePosition.x || 0);
            const dz = od.position.z - (ctx.basePosition.z || 0);
            if (Math.hypot(dx, dz) < 2.0) return false;
          }
          return true;
        });
      }

      scene.add(doorObject);
      doorObjectsRef.current.set(doorId, doorObject);
      console.log("✅ Puerta añadida a la escena");

      setDoors((prev) => [...prev, doorData]);

      return doorObject;
    },
    [scene, wallsMesh, doors]
  );

  const removeDoor = useCallback(
    (doorId) => {
      if (!scene) return;

      const doorObject = scene.children.find(
        (child) =>
          child.userData.type === "door" && child.userData.id === doorId
      );

      if (doorObject) {
        if (typeof doorObject.dispose === "function") doorObject.dispose();
        scene.remove(doorObject);
      }

      if (doorObjectsRef.current.has(doorId)) {
        doorObjectsRef.current.delete(doorId);
      }

      setDoors((prev) => prev.filter((door) => door.id !== doorId));
    },
    [scene]
  );

  const updateDoorPositionInState = useCallback((doorId, newPosition) => {
    setDoors((prev) =>
      prev.map((door) =>
        door.id === doorId
          ? { ...door, position: { x: newPosition.x, z: newPosition.z } }
          : door
      )
    );
  }, []);

  const previewMoveDoor = useCallback(
    (doorId, newPos) => {
      const doorObj =
        doorObjectsRef.current.get(doorId) ||
        scene.children.find(
          (c) => c.userData.type === "door" && c.userData.id === doorId
        );
      if (!doorObj) return false;

      const ok =
        typeof doorObj.moveTo === "function"
          ? doorObj.moveTo(newPos, {
              validate: false,
              snap: true,
              instant: true,
            })
          : false;

      if (ok && typeof updateDoorPositionInState === "function") {
        const p = doorObj.toInfo().position;
        updateDoorPositionInState(doorId, p);
      }
      return ok;
    },
    [scene, updateDoorPositionInState]
  );

  const commitMoveDoor = useCallback(
    (doorId, finalPos) => {
      const doorObj =
        doorObjectsRef.current.get(doorId) ||
        scene.children.find(
          (c) => c.userData.type === "door" && c.userData.id === doorId
        );
      if (!doorObj) return false;

      const ok =
        typeof doorObj.moveTo === "function"
          ? doorObj.moveTo(finalPos, {
              validate: true,
              world: { doors: doorsRef.current },
            })
          : false;

      if (ok) {
        const p = doorObj.toInfo().position;
        updateDoorPositionInState(doorId, p);
      } else {
        if (typeof doorObj.revertPosition === "function")
          doorObj.revertPosition();
      }
      return ok;
    },
    [scene, updateDoorPositionInState]
  );

  const toggleDoorState = useCallback(
    (doorId) => {
      if (!scene) return;

      const doorObject =
        doorObjectsRef.current.get(doorId) ||
        scene.children.find(
          (child) =>
            child.userData.type === "door" && child.userData.id === doorId
        );

      if (doorObject) {
        toggleDoor(doorObject);
      }
    },
    [scene]
  );

  const updateAnimations = useCallback(() => {
    for (const doorObj of doorObjectsRef.current.values()) {
      updateDoorAnimation(doorObj);
    }
  }, []);

  const rebuildWalls = useCallback(() => {
    if (!scene || !wallsMesh || doors.length === 0) return wallsMesh;

    const newWalls = applyDoorCutouts(wallsMesh, doors);

    scene.remove(wallsMesh);
    scene.add(newWalls);

    return newWalls;
  }, [scene, wallsMesh, doors]);

  const clearAllDoors = useCallback(() => {
    if (!scene) return;

    doorObjectsRef.current.forEach((doorObj) => {
      if (typeof doorObj.dispose === "function") doorObj.dispose();
      scene.remove(doorObj);
    });

    doorObjectsRef.current.clear();
    setDoors([]);
  }, [scene]);

  useEffect(() => {
    if (!scene) return;

    let animationId;
    const animate = () => {
      updateAnimations();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [scene, updateAnimations]);

  return {
    doors,
    placementMode,
    selectedDirection,
    setPlacementMode,
    setSelectedDirection,
    addDoor,
    removeDoor,
    toggleDoorState,
    updateDoorPositionInState,
    previewMoveDoor,
    commitMoveDoor,
    rebuildWalls,
    clearAllDoors,
  };
};
