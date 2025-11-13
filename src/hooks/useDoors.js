import { useState, useCallback, useEffect } from "react";
import {
  createDoor,
  applyDoorCutouts,
  updateDoorAnimation,
  toggleDoor,
  isValidDoorPosition,
} from "../utils/createDoor";

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

  /**
   * Añade una nueva puerta en la posición especificada
   */
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

      // Validar posición
      if (!isValidDoorPosition({ ...position, direction })) {
        console.warn("❌ Posición inválida para la puerta");
        return null;
      }

      // Verificar que no haya otra puerta muy cerca
      const tooClose = doors.some((door) => {
        const dx = door.position.x - position.x;
        const dz = door.position.z - position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return distance < 2.5; // Distancia mínima entre puertas
      });

      if (tooClose) {
        console.warn("❌ Ya hay una puerta muy cerca");
        return null;
      }

      const doorId = `door_${Date.now()}`;
      const doorData = { position, direction, id: doorId };

      console.log("✅ Validación pasada, creando puerta:", doorData);

      // Crear el objeto 3D de la puerta
      const doorObject = createDoor(doorData);
      if (!doorObject) {
        console.warn("❌ createDoor devolvió null");
        return null;
      }

      // Añadir a la escena
      scene.add(doorObject);
      console.log("✅ Puerta añadida a la escena");

      // Actualizar estado
      setDoors((prev) => [...prev, doorData]);

      return doorObject;
    },
    [scene, wallsMesh, doors]
  );

  /**
   * Elimina una puerta por ID
   */
  const removeDoor = useCallback(
    (doorId) => {
      if (!scene) return;

      // Buscar y eliminar de la escena
      const doorObject = scene.children.find(
        (child) =>
          child.userData.type === "door" && child.userData.id === doorId
      );

      if (doorObject) {
        scene.remove(doorObject);
      }

      // Actualizar estado (esto disparará useEffect para reconstruir paredes)
      setDoors((prev) => prev.filter((door) => door.id !== doorId));
    },
    [scene]
  );

  /**
   * Actualiza la posición de una puerta en el estado
   */
  const updateDoorPositionInState = useCallback((doorId, newPosition) => {
    setDoors((prev) =>
      prev.map((door) =>
        door.id === doorId
          ? { ...door, position: { x: newPosition.x, z: newPosition.z } }
          : door
      )
    );
  }, []);

  /**
   * Alterna el estado de una puerta (abierta/cerrada)
   */
  const toggleDoorState = useCallback(
    (doorId) => {
      if (!scene) return;

      const doorObject = scene.children.find(
        (child) =>
          child.userData.type === "door" && child.userData.id === doorId
      );

      if (doorObject) {
        toggleDoor(doorObject);
      }
    },
    [scene]
  );

  /**
   * Actualiza las animaciones de todas las puertas
   */
  const updateAnimations = useCallback(() => {
    if (!scene) return;

    scene.children.forEach((child) => {
      if (child.userData.type === "door") {
        updateDoorAnimation(child);
      }
    });
  }, [scene]);

  /**
   * Reconstruye las paredes con los cortes de las puertas
   */
  const rebuildWalls = useCallback(() => {
    if (!scene || !wallsMesh || doors.length === 0) return wallsMesh;

    // Aplicar todos los cortes
    const newWalls = applyDoorCutouts(wallsMesh, doors);

    // Reemplazar en la escena
    scene.remove(wallsMesh);
    scene.add(newWalls);

    return newWalls;
  }, [scene, wallsMesh, doors]);

  /**
   * Limpia todas las puertas
   */
  const clearAllDoors = useCallback(() => {
    if (!scene) return;

    // Eliminar todas las puertas de la escena
    const doorObjects = scene.children.filter(
      (child) => child.userData.type === "door"
    );

    doorObjects.forEach((door) => scene.remove(door));

    // Limpiar estado
    setDoors([]);
  }, [scene]);

  // Efecto para actualizar animaciones en cada frame
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
    rebuildWalls,
    clearAllDoors,
  };
};
