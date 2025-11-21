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
import useEntities from "../hooks/useEntities";
import { createGround } from "../utils/createGround";
import { createTrees } from "../utils/createTree";
import { createHouse } from "../utils/createHouse";

// Simulation
import { ThermalGrid } from "../simulation/ThermalGrid";
import { ThermalParticlesView } from "../simulation/ThermalParticlesView";

// Entities
import {
  Door,
  applyDoorCutouts,
} from "../entities/Door";
import {
  Window,
  applyWindowCutouts,
} from "../entities/Window";
import { Heater } from "../entities/Heater";
import { AirConditioner } from "../entities/AirConditioner";

import {
  updateDoorPosition,
  snapToGrid,
  updateWindowPosition,
} from "../utils/entityUtils";

import { disposeObject } from "../utils/disposeUtils";
import { WINDOW_CONFIG, DOOR_CONFIG } from "../config/entityConfig";
import { TREE_POSITIONS, UI_CONFIG, HOUSE_CONFIG } from "../config/sceneConfig";
import { validateCandidate } from "../utils/entityCollision";
// `isOnWall` and positioning helpers imported above from entityUtils
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

const ThermalHouseSimulator = () => {
  const containerRef = useRef(null);
  const [tempExterna, setTempExterna] = useState(
    UI_CONFIG.temperature.external.default
  );
  const [tempInterna, setTempInterna] = useState(
    UI_CONFIG.temperature.internal.default
  );

  // Force update state from config if defaults change (dev helper)
  useEffect(() => {
    setTempExterna(UI_CONFIG.temperature.external.default);
    setTempInterna(UI_CONFIG.temperature.internal.default);
  }, []);
  const [wallsMeshRef, setWallsMeshRef] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [draggedDoor, setDraggedDoor] = useState(null);
  const dragStartPos = useRef(null);

  const [showGrid, setShowGrid] = useState(true);
  const [gridDensity, setGridDensity] = useState(2); // Default 2x2 per unit
  const gridRef = useRef(null);
  const particlesViewRef = useRef(null);

  // Hooks personalizados para gestionar la escena 3D
  const { scene, camera, renderer } = useThreeScene(containerRef);
  useLighting(scene);
  const composer = usePostProcessing(renderer, scene, camera);
  useWindowResize(camera, renderer, composer, containerRef);

  // Door state previously provided by useDoors wrapper
  const [placementMode, setPlacementMode] = React.useState(false);
  const [selectedDirection, setSelectedDirection] = React.useState("north");

  const {
    items: doors,
    addItem: addDoor,
    removeItem: removeDoor,
    toggleItem: toggleDoorState,
    updateItemPositionInState: updateDoorPositionInState,
    previewMoveItem: previewMoveDoor,
    commitMoveItem: commitMoveDoor,
    clearAllItems: clearAllDoors,
    objectsRef: doorObjectsRef,
  } = useEntities(scene, {
    type: "door",
    createEntity: ({ position, direction, id } = {}) =>
      Door({ position, direction, id }),
  });

  // Windows
  const {
    items: windows,
    addItem: addWindow,
    removeItem: removeWindowFn,
    toggleItem: toggleWindowState,
    updateItemPositionInState: updateWindowPositionInState,
    previewMoveItem: previewMoveWindow,
    commitMoveItem: commitMoveWindow,
    clearAllItems: clearAllWindows,
    objectsRef: windowObjectsRef,
  } = useEntities(scene, {
    type: "window",
    createEntity: ({ position, direction, id } = {}) =>
      Window({ position, direction, id }),
  });

  // Hook para gestionar calefactores (usando useEntities genérico)
  const {
    items: heaters,
    addItem: addHeater,
    removeItem: removeHeater,
    toggleItem: toggleHeaterState,
    updateItemPositionInState: updateHeaterPositionInState,
    commitMoveItem: commitMoveHeater,
    clearAllItems: clearAllHeaters,
  } = useEntities(scene, {
    type: "heater",
    createEntity: ({ position, id } = {}) => Heater({ position, id }),
  });

  // Hook para gestionar aires acondicionados (wall-mounted)
  const {
    items: acs,
    addItem: addAirConditioner,
    removeItem: removeAirConditioner,
    toggleItem: toggleAirConditionerState,
    updateItemPositionInState: updateACPositionInState,
    previewMoveItem: previewMoveAircon,
    commitMoveItem: commitMoveAircon,
    clearAllItems: clearAllACs,
  } = useEntities(scene, {
    type: "aircon",
    createEntity: ({ position, direction, id } = {}) =>
      AirConditioner({ position, direction, id }),
  });

  // Callback de animación para actualizar simulación
  const handleFrame = React.useCallback(
    (deltaTime) => {
      if (gridRef.current) {
        gridRef.current.update(deltaTime, tempExterna, tempInterna, doors, windows, heaters, acs);
      }
      if (particlesViewRef.current && showGrid) {
        particlesViewRef.current.update();
      }
    },
    [tempExterna, tempInterna, showGrid, doors, windows, heaters, acs]
  );

  const fps = useAnimationLoop(composer, handleFrame);

  // Hook para efectos visuales térmicos - REMOVED as per user request
  // useThermalEffects(scene, tempExterna, tempInterna);

  // Inicializar Grid y Partículas
  useEffect(() => {
    if (!scene) return;

    // Crear Grid
    // Definimos el área: -15 a 15 en X, -10 a 10 en Z
    // Densidad: variable (1 a 4)
    const grid = new ThermalGrid(-15, 15, -10, 10, gridDensity);
    gridRef.current = grid;

    // Crear Vista
    const view = new ThermalParticlesView(grid);
    particlesViewRef.current = view;
    scene.add(view.mesh);

    return () => {
      if (view) {
        scene.remove(view.mesh);
        view.dispose();
      }
    };
  }, [scene, gridDensity]); // Re-create when density changes

  // Toggle visibility
  useEffect(() => {
    if (particlesViewRef.current && particlesViewRef.current.mesh) {
      particlesViewRef.current.mesh.visible = showGrid;
    }
  }, [showGrid]);

  // Door state previously provided by useDoors wrapper


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
      // Primero comprobar si clic derecho fue sobre un objeto interactivo (puerta/ventana/calefactor)
      const interactiveObjects = scene.children.filter(
        (child) =>
          child.userData &&
          (child.userData.type === "door" ||
            child.userData.type === "window" ||
            child.userData.type === "heater" ||
            child.userData.type === "aircon")
      );

      const objIntersects = raycaster.intersectObjects(
        interactiveObjects,
        true
      );
      if (objIntersects.length > 0) {
        let group = objIntersects[0].object;
        // Walk up until we find the entity group (door/window/heater/aircon)
        while (
          group &&
          !(
            group.userData &&
            (group.userData.type === "door" ||
              group.userData.type === "window" ||
              group.userData.type === "heater" ||
              group.userData.type === "aircon")
          )
        ) {
          group = group.parent;
        }

        if (
          group &&
          (group.userData.type === "door" ||
            group.userData.type === "window" ||
            group.userData.type === "heater" ||
            group.userData.type === "aircon")
        ) {
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            object: { type: group.userData.type, id: group.userData.id },
          });
          return;
        }
      }

      // Si no fue sobre objeto interactivo, comprobar si fue sobre el suelo (para añadir calefactor)
      const allIntersects = raycaster.intersectObjects(scene.children, true);
      if (allIntersects && allIntersects.length > 0) {
        const nearest = allIntersects[0];
        const obj = nearest.object;
        const isGround =
          obj && (obj.name === "ground" || obj.parent?.name === "ground");
        if (isGround) {
          const point = nearest.point;
          // Only allow heater placement inside the allowed heater footprint (±4)
          const heaterBoundary = 4;
          const insideX = Math.abs(point.x) <= heaterBoundary;
        }
      }

      // Intersectar con el mesh de las paredes directamente
      if (!wallsMeshRef) {
        // Si no hay paredes, simplemente cerrar el menú si está abierto
        setContextMenu(null);
        return;
      }

      const intersects = raycaster.intersectObject(wallsMeshRef, false);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        const intersectPoint = intersect.point;

        // If the hit is near the floor inside the house footprint, treat as floor click
        const heaterBoundary = 4;
        const insideX = Math.abs(intersectPoint.x) <= heaterBoundary;
        const insideZ = Math.abs(intersectPoint.z) <= heaterBoundary;
        const nearFloor = Math.abs(intersectPoint.y) <= 0.2;
        if (insideX && insideZ && nearFloor) {
          const snapped = snapToGrid({
            x: intersectPoint.x,
            z: intersectPoint.z,
          });
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            floorPosition: snapped,
          });
          return;
        }

        // Otherwise treat as wall hit — ensure it's within wall vertical range
        const { wallHeight } = HOUSE_CONFIG;
        if (intersectPoint.y < 0.1 || intersectPoint.y > wallHeight + 0.1) {
          setContextMenu(null);
          return;
        }

        const wallInfo = detectWall(intersectPoint);

        if (wallInfo) {
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            wallPosition: wallInfo.position,
            direction: wallInfo.direction,
          });
        } else {
          setContextMenu(null);
        }
      } else {
        setContextMenu(null);
      }
    };

    // MOUSE DOWN - Iniciar drag o detectar clic en puerta
    const handleMouseDown = (event) => {
      if (event.button !== 0) return; // Solo clic izquierdo

      const coords = getMouseCoords(event);
      mouse.set(coords.x, coords.y);
      raycaster.setFromCamera(mouse, camera);

      // Detectar clic en objeto interactivo (puerta, ventana o calefactor)
      const interactiveObjects = scene.children.filter(
        (child) =>
          child.userData &&
          (child.userData.type === "door" ||
            child.userData.type === "window" ||
            child.userData.type === "heater" ||
            child.userData.type === "aircon")
      );

      const intersects = raycaster.intersectObjects(interactiveObjects, true);

      if (intersects.length > 0) {
        let group = intersects[0].object;

        // Buscar el grupo padre que es la entidad (door/window/heater)
        while (
          group &&
          !(
            group.userData &&
            (group.userData.type === "door" ||
              group.userData.type === "window" ||
              group.userData.type === "heater" ||
              group.userData.type === "aircon")
          )
        ) {
          group = group.parent;
        }

        if (
          group &&
          (group.userData.type === "door" ||
            group.userData.type === "window" ||
            group.userData.type === "heater" ||
            group.userData.type === "aircon")
        ) {
          // Store previous position to allow easy revert on invalid drop
          if (group.userData.type === "door") {
            const prev = doors.find((d) => d.id === group.userData.id);
            if (prev && prev.position) {
              group.userData.prevPosition = {
                x: prev.position.x,
                z: prev.position.z,
              };
            }
          } else if (group.userData.type === "window") {
            const prev = windows.find((w) => w.id === group.userData.id);
            if (prev && prev.position) {
              group.userData.prevPosition = {
                x: prev.position.x,
                z: prev.position.z,
              };
            }
          } else if (group.userData.type === "heater") {
            const prev = heaters.find((h) => h.id === group.userData.id);
            if (prev && prev.position) {
              group.userData.prevPosition = {
                x: prev.position.x,
                z: prev.position.z,
              };
            }
          } else if (group.userData.type === "aircon") {
            const prev = acs.find((a) => a.id === group.userData.id);
            if (prev && prev.position) {
              group.userData.prevPosition = {
                x: prev.position.x,
                z: prev.position.z,
              };
            }
          }
          // Guardar para click/posible drag
          dragStartPos.current = { x: event.clientX, y: event.clientY };
          // Reset drag flag for any interactive object (doors, windows, heaters)
          group.userData.isDragging = undefined; // Reset flag
          // Reset last snapped position so heater jump-snapping starts fresh
          group.userData.lastSnapped = null;
          // Cambiar cursor
          container.style.cursor = "grabbing";
          setDraggedDoor(group);
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

      // Allow drag behavior for heaters as well as doors/windows

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

          // Quitar los cortes mientras se arrastra solo si se arrastra una puerta/ventana
          if (wallsMeshRef && draggedDoor.userData.type !== "heater") {
            scene.remove(wallsMeshRef);
            disposeObject(wallsMeshRef);

            const house = createHouse();

            const remainingDoors = doors.filter(
              (d) => d.id !== draggedDoor.userData.id
            );
            const remainingWindows = windows.filter(
              (w) => w.id !== draggedDoor.userData.id
            );
            const remainingACs = acs.filter(
              (a) => a.id !== draggedDoor.userData.id
            );

            let tempWalls = house.walls;
            if (remainingDoors.length > 0)
              tempWalls = applyDoorCutouts(tempWalls, remainingDoors);
            if (remainingWindows.length > 0)
              tempWalls = applyWindowCutouts(tempWalls, remainingWindows);
            // AC cutouts disabled: do not modify wall mesh for ACs

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

        // Crear plano según la dirección (puerta/ventana) o plano del suelo para calefactor
        let plane;
        if (draggedDoor.userData.type === "heater") {
          // plano horizontal en y = 0
          plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        } else {
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
        }

        const intersectPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
          const newPosition = { x: intersectPoint.x, z: intersectPoint.z };

          if (draggedDoor.userData.type === "heater") {
            // mover sobre el suelo con salto discreto (snap entero)
            const snapped = snapToGrid(newPosition);
            const last = draggedDoor.userData.lastSnapped;
            if (!last || last.x !== snapped.x || last.z !== snapped.z) {
              draggedDoor.position.set(snapped.x, 0, snapped.z);
              draggedDoor.userData.lastSnapped = { x: snapped.x, z: snapped.z };
            }
          } else {
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

            if (draggedDoor.userData.type === "aircon") {
              // Discrete preview move: snap to integer grid and call previewMoveAircon
              const snapped = snapToGrid(newPosition);
              // previewMoveAircon will apply snap & inset visually
              try {
                previewMoveAircon(draggedDoor.userData.id, snapped);
              } catch (e) {
                console.log("Preview move aircon error:", e);
              }
            } else {
              // For door/window use the previewMove handlers supplied by useEntities
              const snapped = snapToGrid(newPosition);
              try {
                if (draggedDoor.userData.type === "door") {
                  previewMoveDoor(draggedDoor.userData.id, snapped);
                } else if (draggedDoor.userData.type === "window") {
                  previewMoveWindow(draggedDoor.userData.id, snapped);
                }
              } catch (e) {
                console.log("Preview move error:", e);
              }
            }
          }
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

        // Si no se movió, es un clic -> toggle (puerta, ventana o calefactor)
        if (distance < 5) {
          if (draggedDoor.userData.type === "door") {
            toggleDoorState(draggedDoor.userData.id);
          } else if (draggedDoor.userData.type === "window") {
            toggleWindowState(draggedDoor.userData.id);
          } else if (draggedDoor.userData.type === "heater") {
            toggleHeaterState(draggedDoor.userData.id);
          } else if (draggedDoor.userData.type === "aircon") {
            toggleAirConditionerState(draggedDoor.userData.id);
          }
        } else if (draggedDoor.userData.isDragging) {
          // Se movió -> actualizar posición en el estado para reconstruir paredes
          const newPos = snapToGrid({
            x: draggedDoor.position.x,
            z: draggedDoor.position.z,
          });
          console.log("New Pos:", newPos);
          // Delegate validation & commit to the entity hooks
          const type = draggedDoor.userData.type;
          const id = draggedDoor.userData.id;
          try {
            if (type === "door") {
              const ok = commitMoveDoor(id, newPos, {
                doors,
                windows,
                heaters,
                acs,
              });
              if (!ok) {
                const prevPos = draggedDoor.userData.prevPosition;
                const prev = prevPos
                  ? { position: prevPos }
                  : doors.find((d) => d.id === id);
                if (prev && prev.position) {
                  updateDoorPosition(draggedDoor, {
                    x: prev.position.x,
                    z: prev.position.z,
                  });
                  updateDoorPositionInState(id, prev.position);
                }
              }
            } else if (type === "window") {
              const ok = commitMoveWindow(id, newPos, {
                doors,
                windows,
                heaters,
                acs,
              });
              if (!ok) {
                const prevPos = draggedDoor.userData.prevPosition;
                const prev = prevPos
                  ? { position: prevPos }
                  : windows.find((w) => w.id === id);
                if (prev && prev.position) {
                  updateWindowPosition(draggedDoor, {
                    x: prev.position.x,
                    z: prev.position.z,
                  });
                  updateWindowPositionInState(id, prev.position);
                }
              }
            } else if (type === "heater") {
              const ok = commitMoveHeater(id, newPos, {
                doors,
                windows,
                heaters,
                acs,
              });
              if (!ok) {
                const prevPos = draggedDoor.userData.prevPosition;
                const prev = prevPos
                  ? { position: prevPos }
                  : heaters.find((h) => h.id === id);
                if (prev && prev.position) {
                  draggedDoor.position.set(prev.position.x, 0, prev.position.z);
                  updateHeaterPositionInState(id, prev.position);
                }
              } else {
                // rotate accepted heater to face center from new position
                try {
                  const obj = scene.children.find(
                    (c) => c.userData?.type === "heater" && c.userData.id === id
                  );
                  if (obj) {
                    const raw = Math.atan2(-newPos.x, -newPos.z);
                    const step = Math.PI / 2;
                    obj.rotation.y = Math.round(raw / step) * step;
                  }
                } catch (e) {
                  // ignore
                }
              }
            } else if (type === "aircon") {
              const ok = commitMoveAircon(id, newPos, {
                doors,
                windows,
                heaters,
                acs,
              });
              if (!ok) {
                const prevPos = draggedDoor.userData.prevPosition;
                const prev = prevPos
                  ? { position: prevPos }
                  : acs.find((a) => a.id === id);
                if (prev && prev.position) {
                  updateACPositionInState(id, prev.position);
                }
              }
            }
          } catch (e) {
            // restore previous on unexpected error
            const prevPos = draggedDoor.userData.prevPosition;
            const prev = prevPos ? { position: prevPos } : null;
            if (prev && prev.position) {
              if (draggedDoor.userData.type === "door")
                updateDoorPositionInState(id, prev.position);
              else if (draggedDoor.userData.type === "window")
                updateWindowPositionInState(id, prev.position);
              else if (draggedDoor.userData.type === "aircon")
                updateACPositionInState(id, prev.position);
              else if (draggedDoor.userData.type === "heater")
                updateHeaterPositionInState(id, prev.position);
            }
          }
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
    windows,
    contextMenu,
  ]);

  // Manejar reconstrucción de paredes con cortes de puertas
  const handleRebuildWalls = () => {
    if (!scene || !wallsMeshRef) return;

    // Remover paredes antiguas
    scene.remove(wallsMeshRef);
    disposeObject(wallsMeshRef);

    // Crear paredes nuevas
    const house = createHouse();
    let newWalls = house.walls;
    if (doors && doors.length > 0) {
      newWalls = applyDoorCutouts(newWalls, doors);
    }
    if (windows && windows.length > 0) {
      newWalls = applyWindowCutouts(newWalls, windows);
    }
    // AC cutouts disabled: do not modify walls for aircons

    // Añadir a la escena
    scene.add(newWalls);
    setWallsMeshRef(newWalls);
  };

  // Manejar selección de componente desde el menú contextual
  const handleSelectComponent = (componentType) => {
    if (!contextMenu) return;

    if (componentType === "door") {
      const candidate = {
        position: contextMenu.wallPosition,
        direction: contextMenu.direction,
      };
      const candidateFull = {
        type: "door",
        position: contextMenu.wallPosition,
        direction: contextMenu.direction,
      };
      const others = [...windows, ...heaters, ...acs];
      if (!validateCandidate(candidateFull, others)) {
        console.warn(
          "No se puede añadir la puerta: conflicto con otra entidad"
        );
        return;
      }
      const door = addDoor({
        position: contextMenu.wallPosition,
        direction: contextMenu.direction,
      });
      if (door) {
        console.log("🚪 Puerta añadida desde menú contextual");
      }
    } else if (componentType === "window") {
      const candidate = {
        position: contextMenu.wallPosition,
        direction: contextMenu.direction,
      };
      const candidateFull = {
        type: "window",
        position: contextMenu.wallPosition,
        direction: contextMenu.direction,
      };
      const others = [...doors, ...heaters, ...acs];
      if (!validateCandidate(candidateFull, others)) {
        console.warn(
          "No se puede añadir la ventana: conflicto con otra entidad"
        );
        return;
      }
      console.log("WWI", contextMenu.wallPosition, contextMenu.direction);
      const win = addWindow({
        position: contextMenu.wallPosition,
        direction: contextMenu.direction,
      });
      console.log("AA");
      if (win) {
        console.log("🪟 Ventana añadida desde menú contextual");
      }
    } else if (componentType === "heater") {
      // floorPosition expected in contextMenu
      if (!contextMenu || !contextMenu.floorPosition) {
        console.warn("No floor position available for heater placement");
        return;
      }
      // Check overlap with doors/windows before placing
      const candidatePos = contextMenu.floorPosition;
      const candidateFull = { type: "heater", position: candidatePos };
      const others = [...doors, ...windows, ...acs];
      if (!validateCandidate(candidateFull, others)) {
        console.warn(
          "No se puede añadir el calefactor: conflicto con otra entidad"
        );
        return;
      }
      const heater = addHeater({
        position: contextMenu.floorPosition,
      });
      if (heater) console.log("🔥 Calefactor añadido desde menú contextual");
    } else if (componentType === "aircon") {
      const candidate = {
        position: contextMenu.wallPosition,
        direction: contextMenu.direction,
      };
      const candidateFull = {
        type: "aircon",
        position: contextMenu.wallPosition,
        direction: contextMenu.direction,
      };
      const others = [...doors, ...windows, ...heaters, ...acs];
      if (!validateCandidate(candidateFull, others)) {
        console.warn(
          "No se puede añadir el aire acondicionado: conflicto con otra entidad"
        );
        return;
      }
      const ac = addAirConditioner({
        position: contextMenu.wallPosition,
        direction: contextMenu.direction,
      });
      if (ac) console.log("❄️ AC añadido desde menú contextual");
    }
  };

  // Manejar eliminación desde el menú contextual
  const handleDeleteObject = (objectInfo) => {
    if (!objectInfo || !objectInfo.type) return;
    if (objectInfo.type === "door") {
      removeDoor(objectInfo.id);
    } else if (objectInfo.type === "window") {
      removeWindowFn(objectInfo.id);
    } else if (objectInfo.type === "heater") {
      removeHeater(objectInfo.id);
    } else if (objectInfo.type === "aircon") {
      removeAirConditioner(objectInfo.id);
    }
    setContextMenu(null);
  };

  // Reconstruir paredes automáticamente cuando cambian las puertas
  useEffect(() => {
    // If a user is actively dragging an entity, skip automatic rebuilds
    // so preview moves don't trigger CSG cut operations. The drag handler
    // already manages a temporary wall mesh while dragging.
    if (!scene || !wallsMeshRef) return;
    if (draggedDoor && draggedDoor.userData?.isDragging) return;

    // Remover paredes antiguas
    scene.remove(wallsMeshRef);
    disposeObject(wallsMeshRef);

    // Crear paredes nuevas
    const house = createHouse();

    // Si hay puertas o ventanas, aplicar cortes CSG
    let newWalls = house.walls;
    if (doors.length > 0) {
      newWalls = applyDoorCutouts(newWalls, doors);
    }
    if (windows && windows.length > 0) {
      // aplicar cortes de ventanas sobre el resultado
      newWalls = applyWindowCutouts(newWalls, windows);
    }
    // AC cutouts disabled: do not modify walls for aircons

    // Añadir a la escena
    scene.add(newWalls);
    setWallsMeshRef(newWalls);
  }, [doors, windows, acs, scene]);

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
        showGrid={showGrid}
        onShowGridChange={setShowGrid}
        gridDensity={gridDensity}
        onGridDensityChange={setGridDensity}
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
        onDeleteObject={handleDeleteObject}
      />
    </div>
  );
};

export default ThermalHouseSimulator;
