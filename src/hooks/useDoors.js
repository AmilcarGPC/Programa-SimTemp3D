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
  // Mantener una colección rápida de referencias a los objetos 3D de las puertas
  // para no iterar `scene.children` cada frame.
  const doorObjectsRef = useRef(new Map());
  const doorsRef = useRef(doors);

  useEffect(() => {
    doorsRef.current = doors;
  }, [doors]);

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

      // Registrar un validador que impida solapamientos con otras puertas
      if (typeof doorObject.setValidator === "function") {
        doorObject.setValidator((entity, ctx) => {
          // validar posición local primero
          if (typeof entity.validatePosition === "function") {
            const okLocal = entity.validatePosition(
              ctx.world,
              ctx.basePosition
            );
            if (!okLocal) return false;
          }

          // evitar puertas muy cercanas
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

      // Añadir a la escena
      scene.add(doorObject);
      // Guardar referencia para actualizaciones rápidas (animación, toggles)
      try {
        doorObjectsRef.current.set(doorId, doorObject);
      } catch (e) {
        // defensivo: si algo sale mal, no rompemos la creación
        console.warn("useDoors: no se pudo registrar doorObject en map", e);
      }
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
        try {
          if (typeof doorObject.dispose === "function") doorObject.dispose();
        } catch (e) {}
        scene.remove(doorObject);
      }

      // Eliminar referencia rápida si existe
      if (doorObjectsRef.current.has(doorId)) {
        doorObjectsRef.current.delete(doorId);
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

  // Movimiento en vista previa (drag): mover sin validar para feedback inmediato
  const previewMoveDoor = useCallback(
    (doorId, newPos) => {
      const doorObj =
        doorObjectsRef.current.get(doorId) ||
        scene.children.find(
          (c) => c.userData.type === "door" && c.userData.id === doorId
        );
      if (!doorObj) return false;
      try {
        const ok =
          typeof doorObj.moveTo === "function"
            ? doorObj.moveTo(newPos, {
                validate: false,
                snap: true,
                instant: true,
              })
            : false;
        // actualizar estado para UI
        if (ok && typeof updateDoorPositionInState === "function") {
          const p = doorObj.toInfo().position;
          updateDoorPositionInState(doorId, p);
        }
        return ok;
      } catch (e) {
        return false;
      }
    },
    [scene, updateDoorPositionInState]
  );

  // Commit final: validar con contexto global y aplicar o revertir
  const commitMoveDoor = useCallback(
    (doorId, finalPos) => {
      const doorObj =
        doorObjectsRef.current.get(doorId) ||
        scene.children.find(
          (c) => c.userData.type === "door" && c.userData.id === doorId
        );
      if (!doorObj) return false;
      try {
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
      } catch (e) {
        try {
          if (typeof doorObj.revertPosition === "function")
            doorObj.revertPosition();
        } catch (e) {}
        return false;
      }
    },
    [scene, updateDoorPositionInState]
  );

  /**
   * Alterna el estado de una puerta (abierta/cerrada)
   */
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
        if (typeof doorObject.toggle === "function") {
          try {
            doorObject.toggle(false);
          } catch (e) {
            toggleDoor(doorObject);
          }
        } else {
          toggleDoor(doorObject);
        }
      }
    },
    [scene]
  );

  /**
   * Actualiza las animaciones de todas las puertas
   */
  const updateAnimations = useCallback(() => {
    // Iterar sólo las puertas registradas para mejorar performance
    const map = doorObjectsRef.current;
    if (map && map.size > 0) {
      for (const doorObj of map.values()) {
        try {
          if (typeof doorObj.updateAnimation === "function")
            doorObj.updateAnimation();
          else updateDoorAnimation(doorObj);
        } catch (e) {
          console.warn("useDoors: fallo al actualizar animación de puerta", e);
        }
      }
    }
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
    // Usar el map para eliminar de forma segura
    doorObjectsRef.current.forEach((doorObj) => {
      try {
        if (typeof doorObj.dispose === "function") doorObj.dispose();
        scene.remove(doorObj);
      } catch (e) {
        console.warn("useDoors: error al eliminar puerta del scene", e);
      }
    });

    // Limpiar map
    doorObjectsRef.current.clear();

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
    previewMoveDoor,
    commitMoveDoor,
    rebuildWalls,
    clearAllDoors,
  };
};
