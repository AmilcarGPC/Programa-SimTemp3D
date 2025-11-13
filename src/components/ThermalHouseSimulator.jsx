import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Canvas3D from "./Canvas3D";
import ControlPanel from "./ControlPanel";
import MetricsBar from "./MetricsBar";
import ContextMenu from "./ContextMenu";
import { useThreeScene } from "../hooks/useThreeScene";
import { useLighting } from "../hooks/useLighting";
import { usePostProcessing } from "../hooks/usePostProcessing";
import { useWindowResize } from "../hooks/useWindowResize";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { useThermalEffects } from "../hooks/useThermalEffects";
import { useDoors } from "../hooks/useDoors";
import { createGround } from "../utils/createGround";
import { createTrees } from "../utils/createTree";
import { createHouse } from "../utils/createHouse";
import {
  applyDoorCutouts,
  toggleDoor,
  updateDoorPosition,
  snapToGrid,
} from "../utils/createDoor";
import { disposeObject } from "../utils/disposeUtils";
import { TREE_POSITIONS, UI_CONFIG, HOUSE_CONFIG } from "../config/sceneConfig";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

const ThermalHouseSimulator = () => {
  const containerRef = useRef(null);
  const [tempExterna, setTempExterna] = useState(
    UI_CONFIG.temperature.external.default
  );
  const [tempInterna, setTempInterna] = useState(
    UI_CONFIG.temperature.internal.default
  );
  const [wallsMeshRef, setWallsMeshRef] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [draggedDoor, setDraggedDoor] = useState(null);
  const dragStartPos = useRef(null);

  // Hooks personalizados para gestionar la escena 3D
  const { scene, camera, renderer } = useThreeScene(containerRef);
  useLighting(scene);
  const composer = usePostProcessing(renderer, scene, camera);
  useWindowResize(camera, renderer, composer, containerRef);
  const fps = useAnimationLoop(composer);

  // Hook para efectos visuales térmicos
  useThermalEffects(scene, tempExterna, tempInterna);

  // Hook para gestionar puertas
  const {
    doors,
    placementMode,
    selectedDirection,
    setPlacementMode,
    setSelectedDirection,
    addDoor,
    removeDoor,
    toggleDoorState,
    updateDoorPositionInState,
    clearAllDoors,
  } = useDoors(scene, wallsMeshRef);

  // Inicializar la escena con objetos 3D
  useEffect(() => {
    if (!scene) return;

    // Crear y añadir el suelo
    const ground = createGround();
    if (ground) scene.add(ground);

    // Crear y añadir árboles
    const trees = createTrees(TREE_POSITIONS);
    trees.forEach((tree) => scene.add(tree));

    // Crear y añadir la casa
    const house = createHouse();
    if (house.floor) scene.add(house.floor);
    if (house.walls) {
      scene.add(house.walls);
      setWallsMeshRef(house.walls);
    }
    house.markers.forEach((marker) => scene.add(marker));

    // Cleanup
    return () => {
      // Remove from scene if present
      try {
        if (ground) scene.remove(ground);
        trees.forEach((tree) => scene.remove(tree));
        if (house.floor) scene.remove(house.floor);
        if (house.walls) scene.remove(house.walls);
        house.markers.forEach((marker) => scene.remove(marker));

        // Liberar memoria con helper robusto
        if (ground) disposeObject(ground);

        trees.forEach((tree) => {
          disposeObject(tree);
        });

        if (house.floor) disposeObject(house.floor);
        if (house.walls) disposeObject(house.walls);
      } catch (e) {
        // Evitar romper el unmount por cualquier error de limpieza
        // eslint-disable-next-line no-console
        console.warn("Cleanup error:", e);
      }
    };
  }, [scene]);

  // Sistema de interacción con mouse (clic derecho, drag & drop, clic en puerta)
  useEffect(() => {
    if (!scene || !camera || !containerRef.current) return;

    const container = containerRef.current;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Helper para obtener coordenadas del mouse
    const getMouseCoords = (event) => {
      const rect = container.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    // Helper para detectar qué muro se está apuntando (validación estricta con grosor)
    const detectWall = (intersectPoint) => {
      const { size, wallThickness } = HOUSE_CONFIG;
      const halfSize = size / 2;
      const wallTolerance = wallThickness + 0.1; // Considerar grosor del muro

      // Determinar qué muro está más cerca
      const distances = {
        north: Math.abs(intersectPoint.z + halfSize),
        south: Math.abs(intersectPoint.z - halfSize),
        east: Math.abs(intersectPoint.x - halfSize),
        west: Math.abs(intersectPoint.x + halfSize),
      };

      const closestWall = Object.keys(distances).reduce((a, b) =>
        distances[a] < distances[b] ? a : b
      );

      // Solo retornar si está lo suficientemente cerca del muro (dentro del grosor)
      if (distances[closestWall] < wallTolerance) {
        let position = {
          x:
            closestWall === "east"
              ? halfSize
              : closestWall === "west"
              ? -halfSize
              : intersectPoint.x,
          z:
            closestWall === "north"
              ? -halfSize
              : closestWall === "south"
              ? halfSize
              : intersectPoint.z,
        };

        // Snap a valores enteros
        position = snapToGrid(position);

        return {
          direction: closestWall,
          position: position,
        };
      }

      return null;
    };

    // CLIC DERECHO - Mostrar/cerrar menú contextual
    const handleContextMenu = (event) => {
      event.preventDefault();

      const coords = getMouseCoords(event);
      mouse.set(coords.x, coords.y);
      raycaster.setFromCamera(mouse, camera);

      // Intersectar con el mesh de las paredes directamente
      if (!wallsMeshRef) {
        // Si no hay paredes, simplemente cerrar el menú si está abierto
        setContextMenu(null);
        return;
      }

      const intersects = raycaster.intersectObject(wallsMeshRef, false);

      if (intersects.length > 0) {
        const intersectPoint = intersects[0].point;

        // Validar que la intersección esté en la altura de los muros (no piso)
        // Permitir desde ligeramente arriba del piso (0.15) hasta el techo completo
        const { wallHeight } = HOUSE_CONFIG;
        if (intersectPoint.y < 0.1 || intersectPoint.y > wallHeight + 0.1) {
          // Está en el piso o fuera del rango, cerrar menú si está abierto
          setContextMenu(null);
          return;
        }

        const wallInfo = detectWall(intersectPoint);

        if (wallInfo) {
          // Abrir menú en la posición del muro válido
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            wallPosition: wallInfo.position,
            direction: wallInfo.direction,
          });
        } else {
          // No hay muro válido, cerrar menú
          setContextMenu(null);
        }
      } else {
        // No intersectó nada, cerrar menú si está abierto
        setContextMenu(null);
      }
    };

    // MOUSE DOWN - Iniciar drag o detectar clic en puerta
    const handleMouseDown = (event) => {
      if (event.button !== 0) return; // Solo clic izquierdo

      const coords = getMouseCoords(event);
      mouse.set(coords.x, coords.y);
      raycaster.setFromCamera(mouse, camera);

      // Detectar clic en puerta
      const doorObjects = scene.children.filter(
        (child) => child.userData.type === "door"
      );

      const intersects = raycaster.intersectObjects(doorObjects, true);

      if (intersects.length > 0) {
        let doorGroup = intersects[0].object;

        // Buscar el grupo padre que es la puerta
        while (doorGroup && doorGroup.userData.type !== "door") {
          doorGroup = doorGroup.parent;
        }

        if (doorGroup && doorGroup.userData.type === "door") {
          // Guardar para drag
          dragStartPos.current = { x: event.clientX, y: event.clientY };
          doorGroup.userData.isDragging = undefined; // Reset flag
          setDraggedDoor(doorGroup);

          // Cambiar cursor
          container.style.cursor = "grabbing";
          return;
        }
      }
    };

    // MOUSE MOVE - Drag de puerta y hover
    const handleMouseMove = (event) => {
      // Hover sobre puertas cuando no está arrastrando
      if (!draggedDoor) {
        const coords = getMouseCoords(event);
        mouse.set(coords.x, coords.y);
        raycaster.setFromCamera(mouse, camera);

        const doorObjects = scene.children.filter(
          (child) => child.userData.type === "door"
        );

        const intersects = raycaster.intersectObjects(doorObjects, true);
        container.style.cursor = intersects.length > 0 ? "pointer" : "default";
        return;
      }

      // Drag de puerta
      if (!dragStartPos.current) return;

      const dx = event.clientX - dragStartPos.current.x;
      const dy = event.clientY - dragStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Solo iniciar drag real si se movió más de 5 pixels
      if (distance > 5) {
        // Si es el primer movimiento real, remover los cortes AHORA
        if (draggedDoor.userData.isDragging === undefined) {
          draggedDoor.userData.isDragging = true;

          // Quitar los cortes mientras se arrastra
          if (wallsMeshRef && doors.length > 0) {
            scene.remove(wallsMeshRef);
            disposeObject(wallsMeshRef);

            const house = createHouse();
            const tempWalls =
              doors.length > 1
                ? applyDoorCutouts(
                    house.walls,
                    doors.filter((d) => d.id !== draggedDoor.userData.id)
                  )
                : house.walls;

            scene.add(tempWalls);
            setWallsMeshRef(tempWalls);
          }
        }
        const coords = getMouseCoords(event);
        mouse.set(coords.x, coords.y);
        raycaster.setFromCamera(mouse, camera);

        // Obtener la dirección de la puerta
        const direction = draggedDoor.userData.direction;
        const { size } = HOUSE_CONFIG;
        const halfSize = size / 2;

        // Crear plano según la dirección
        let plane;
        switch (direction) {
          case "north":
            plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), halfSize);
            break;
          case "south":
            plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), halfSize);
            break;
          case "east":
            plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), halfSize);
            break;
          case "west":
            plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), halfSize);
            break;
        }

        const intersectPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
          const newPosition = { x: intersectPoint.x, z: intersectPoint.z };

          // Ajustar al muro
          switch (direction) {
            case "north":
              newPosition.z = -halfSize;
              break;
            case "south":
              newPosition.z = halfSize;
              break;
            case "east":
              newPosition.x = halfSize;
              break;
            case "west":
              newPosition.x = -halfSize;
              break;
          }

          updateDoorPosition(draggedDoor, newPosition);
        }
      }
    };

    // MOUSE UP - Finalizar drag o hacer clic
    const handleMouseUp = (event) => {
      if (event.button !== 0) return;

      if (draggedDoor && dragStartPos.current) {
        const dx = event.clientX - dragStartPos.current.x;
        const dy = event.clientY - dragStartPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Si no se movió, es un clic -> toggle puerta
        if (distance < 5) {
          toggleDoor(draggedDoor, true); // true = instantáneo
        } else if (draggedDoor.userData.isDragging) {
          // Se movió -> actualizar posición en el estado para reconstruir paredes
          const newPos = snapToGrid({
            x: draggedDoor.position.x,
            z: draggedDoor.position.z,
          });
          updateDoorPositionInState(draggedDoor.userData.id, newPos);
        }
      }

      // Reset drag state
      if (draggedDoor) {
        delete draggedDoor.userData.isDragging;
      }
      setDraggedDoor(null);
      dragStartPos.current = null;
      container.style.cursor = "default";
    };

    // Agregar event listeners
    container.addEventListener("contextmenu", handleContextMenu);
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("contextmenu", handleContextMenu);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    scene,
    camera,
    containerRef,
    draggedDoor,
    wallsMeshRef,
    doors,
    contextMenu,
  ]);

  // Manejar reconstrucción de paredes con cortes de puertas
  const handleRebuildWalls = () => {
    if (!scene || !wallsMeshRef || doors.length === 0) return;

    // Remover paredes antiguas
    scene.remove(wallsMeshRef);
    disposeObject(wallsMeshRef);

    // Crear paredes nuevas
    const house = createHouse();
    const newWalls = applyDoorCutouts(house.walls, doors);

    // Añadir a la escena
    scene.add(newWalls);
    setWallsMeshRef(newWalls);
  };

  // Manejar selección de componente desde el menú contextual
  const handleSelectComponent = (componentType) => {
    if (!contextMenu) return;

    if (componentType === "door") {
      const door = addDoor(contextMenu.wallPosition, contextMenu.direction);
      if (door) {
        console.log("🚪 Puerta añadida desde menú contextual");
      }
    }
  };

  // Reconstruir paredes automáticamente cuando cambian las puertas
  useEffect(() => {
    if (!scene || !wallsMeshRef) return;

    // Remover paredes antiguas
    scene.remove(wallsMeshRef);
    disposeObject(wallsMeshRef);

    // Crear paredes nuevas
    const house = createHouse();

    // Si hay puertas, aplicar cortes CSG
    const newWalls =
      doors.length > 0 ? applyDoorCutouts(house.walls, doors) : house.walls; // Sin puertas, usar paredes originales

    // Añadir a la escena
    scene.add(newWalls);
    setWallsMeshRef(newWalls);
  }, [doors, scene]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
        position: "fixed",
        top: 0,
        left: 0,
        // Inyectar variables CSS para mantener una sola fuente de verdad
        ["--side-panel-width"]: `${UI_CONFIG.sidePanel.width}px`,
        ["--footer-height"]: `${UI_CONFIG.footer.height}px`,
      }}
    >
      <Canvas3D ref={containerRef} />

      <ControlPanel
        tempExterna={tempExterna}
        tempInterna={tempInterna}
        onTempExternaChange={setTempExterna}
        onTempInternaChange={setTempInterna}
        doorControlProps={{
          doors,
          onToggleDoor: toggleDoorState,
          onRemoveDoor: removeDoor,
          onClearAll: clearAllDoors,
          onRebuildWalls: handleRebuildWalls,
        }}
      />

      <MetricsBar fps={fps} />

      <ContextMenu
        position={contextMenu}
        onClose={() => setContextMenu(null)}
        onSelectComponent={handleSelectComponent}
      />
    </div>
  );
};

export default ThermalHouseSimulator;
