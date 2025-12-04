import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import {
  snapToGrid,
  updateDoorPosition,
  updateWindowPosition,
} from "../utils/entityUtils";
import { disposeObject } from "../utils/disposeUtils";
import { createHouse } from "../utils/createHouse";
import { applyDoorCutouts } from "../entities/Door";
import { applyWindowCutouts } from "../entities/Window";

export const useSceneInteraction = ({
  scene,
  camera,
  containerRef,
  wallsMeshRef,
  setWallsMeshRef,
  entities, // { doors, windows, heaters, acs }
  actions, // { door: { toggle, commit, update, preview }, window: ..., ... }
}) => {
  const [contextMenu, setContextMenu] = useState(null);
  const [draggedDoor, setDraggedDoor] = useState(null);
  const dragStartPos = useRef(null);

  useEffect(() => {
    if (!scene || !camera || !containerRef.current) return;

    const container = containerRef.current;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getMouseCoords = (event) => {
      const rect = container.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    const detectWall = (intersectPoint) => {
      const { size, wallThickness } = HOUSE_CONFIG;
      const halfSize = size / 2;
      const wallTolerance = wallThickness + 0.1;

      const distances = {
        north: Math.abs(intersectPoint.z + halfSize),
        south: Math.abs(intersectPoint.z - halfSize),
        east: Math.abs(intersectPoint.x - halfSize),
        west: Math.abs(intersectPoint.x + halfSize),
      };

      const closestWall = Object.keys(distances).reduce((a, b) =>
        distances[a] < distances[b] ? a : b
      );

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

        position = snapToGrid(position);

        return {
          direction: closestWall,
          position: position,
        };
      }

      return null;
    };

    const handleContextMenu = (event) => {
      event.preventDefault();

      const coords = getMouseCoords(event);
      mouse.set(coords.x, coords.y);
      raycaster.setFromCamera(mouse, camera);

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

      const allIntersects = raycaster.intersectObjects(scene.children, true);
      if (allIntersects && allIntersects.length > 0) {
        const nearest = allIntersects[0];
        const obj = nearest.object;
        const isGround =
          obj && (obj.name === "ground" || obj.parent?.name === "ground");
        if (isGround) {
        }
      }

      if (!wallsMeshRef) {
        setContextMenu(null);
        return;
      }

      const intersects = raycaster.intersectObject(wallsMeshRef, false);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        const intersectPoint = intersect.point;

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

    const handleMouseDown = (event) => {
      if (event.button !== 0) return;

      const coords = getMouseCoords(event);
      mouse.set(coords.x, coords.y);
      raycaster.setFromCamera(mouse, camera);

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
          const type = group.userData.type;
          const id = group.userData.id;
          let prev = null;

          if (type === "door") prev = entities.doors.find((d) => d.id === id);
          else if (type === "window")
            prev = entities.windows.find((w) => w.id === id);
          else if (type === "heater")
            prev = entities.heaters.find((h) => h.id === id);
          else if (type === "aircon")
            prev = entities.acs.find((a) => a.id === id);

          if (prev && prev.position) {
            group.userData.prevPosition = {
              x: prev.position.x,
              z: prev.position.z,
            };
          }

          dragStartPos.current = { x: event.clientX, y: event.clientY };
          group.userData.isDragging = undefined;
          group.userData.lastSnapped = null;
          container.style.cursor = "grabbing";
          setDraggedDoor(group);
          return;
        }
      }
    };

    const handleMouseMove = (event) => {
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

      if (!dragStartPos.current) return;

      const dx = event.clientX - dragStartPos.current.x;
      const dy = event.clientY - dragStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        if (draggedDoor.userData.isDragging === undefined) {
          draggedDoor.userData.isDragging = true;

          if (wallsMeshRef && draggedDoor.userData.type !== "heater") {
            scene.remove(wallsMeshRef);
            disposeObject(wallsMeshRef);

            const house = createHouse();

            const remainingDoors = entities.doors.filter(
              (d) => d.id !== draggedDoor.userData.id
            );
            const remainingWindows = entities.windows.filter(
              (w) => w.id !== draggedDoor.userData.id
            );

            let tempWalls = house.walls;
            if (remainingDoors.length > 0)
              tempWalls = applyDoorCutouts(tempWalls, remainingDoors);
            if (remainingWindows.length > 0)
              tempWalls = applyWindowCutouts(tempWalls, remainingWindows);

            scene.add(tempWalls);
            setWallsMeshRef(tempWalls);
          }
        }
        const coords = getMouseCoords(event);
        mouse.set(coords.x, coords.y);
        raycaster.setFromCamera(mouse, camera);

        const direction = draggedDoor.userData.direction;
        const { size } = HOUSE_CONFIG;
        const halfSize = size / 2;

        let plane;
        if (draggedDoor.userData.type === "heater") {
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
            const snapped = snapToGrid(newPosition);
            const last = draggedDoor.userData.lastSnapped;
            if (!last || last.x !== snapped.x || last.z !== snapped.z) {
              draggedDoor.position.set(snapped.x, 0, snapped.z);
              draggedDoor.userData.lastSnapped = { x: snapped.x, z: snapped.z };
            }
          } else {
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

            const snapped = snapToGrid(newPosition);
            try {
              if (draggedDoor.userData.type === "aircon") {
                if (actions.aircon.previewMove)
                  actions.aircon.previewMove(draggedDoor.userData.id, snapped);
              } else if (draggedDoor.userData.type === "door") {
                if (actions.door.previewMove)
                  actions.door.previewMove(draggedDoor.userData.id, snapped);
              } else if (draggedDoor.userData.type === "window") {
                if (actions.window.previewMove)
                  actions.window.previewMove(draggedDoor.userData.id, snapped);
              }
            } catch (e) {
              console.log("Preview move error:", e);
            }
          }
        }
      }
    };

    const handleMouseUp = (event) => {
      if (event.button !== 0) return;

      if (draggedDoor && dragStartPos.current) {
        const dx = event.clientX - dragStartPos.current.x;
        const dy = event.clientY - dragStartPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
          const type = draggedDoor.userData.type;
          const id = draggedDoor.userData.id;
          if (type === "door" && actions.door.toggle) actions.door.toggle(id);
          else if (type === "window" && actions.window.toggle)
            actions.window.toggle(id);
          else if (type === "heater" && actions.heater.toggle)
            actions.heater.toggle(id);
          else if (type === "aircon" && actions.aircon.toggle)
            actions.aircon.toggle(id);
        } else if (draggedDoor.userData.isDragging) {
          const newPos = snapToGrid({
            x: draggedDoor.position.x,
            z: draggedDoor.position.z,
          });
          const type = draggedDoor.userData.type;
          const id = draggedDoor.userData.id;
          const allEntities = {
            doors: entities.doors,
            windows: entities.windows,
            heaters: entities.heaters,
            acs: entities.acs,
          };

          try {
            if (type === "door") {
              const ok = actions.door.commitMove(id, newPos, allEntities);
              if (!ok) {
                const prevPos = draggedDoor.userData.prevPosition;
                const prev = prevPos
                  ? { position: prevPos }
                  : entities.doors.find((d) => d.id === id);
                if (prev && prev.position) {
                  updateDoorPosition(draggedDoor, {
                    x: prev.position.x,
                    z: prev.position.z,
                  });
                  actions.door.updatePosInState(id, prev.position);
                }
              }
            } else if (type === "window") {
              const ok = actions.window.commitMove(id, newPos, allEntities);
              if (!ok) {
                const prevPos = draggedDoor.userData.prevPosition;
                const prev = prevPos
                  ? { position: prevPos }
                  : entities.windows.find((w) => w.id === id);
                if (prev && prev.position) {
                  updateWindowPosition(draggedDoor, {
                    x: prev.position.x,
                    z: prev.position.z,
                  });
                  actions.window.updatePosInState(id, prev.position);
                }
              }
            } else if (type === "heater") {
              const ok = actions.heater.commitMove(id, newPos, allEntities);
              if (!ok) {
                const prevPos = draggedDoor.userData.prevPosition;
                const prev = prevPos
                  ? { position: prevPos }
                  : entities.heaters.find((h) => h.id === id);
                if (prev && prev.position) {
                  draggedDoor.position.set(prev.position.x, 0, prev.position.z);
                  actions.heater.updatePosInState(id, prev.position);
                }
              } else {
                try {
                  const obj = scene.children.find(
                    (c) => c.userData?.type === "heater" && c.userData.id === id
                  );
                  if (obj) {
                    const raw = Math.atan2(-newPos.x, -newPos.z);
                    const step = Math.PI / 2;
                    obj.rotation.y = Math.round(raw / step) * step;
                  }
                } catch (e) {}
              }
            } else if (type === "aircon") {
              const ok = actions.aircon.commitMove(id, newPos, allEntities);
              if (!ok) {
                const prevPos = draggedDoor.userData.prevPosition;
                const prev = prevPos
                  ? { position: prevPos }
                  : entities.acs.find((a) => a.id === id);
                if (prev && prev.position) {
                  actions.aircon.updatePosInState(id, prev.position);
                }
              }
            }
          } catch (e) {
            const prevPos = draggedDoor.userData.prevPosition;
            const prev = prevPos ? { position: prevPos } : null;
            if (prev && prev.position) {
              if (type === "door")
                actions.door.updatePosInState(id, prev.position);
              else if (type === "window")
                actions.window.updatePosInState(id, prev.position);
              else if (type === "aircon")
                actions.aircon.updatePosInState(id, prev.position);
              else if (type === "heater")
                actions.heater.updatePosInState(id, prev.position);
            }
          }
        }
      }

      if (draggedDoor) {
        delete draggedDoor.userData.isDragging;
      }
      setDraggedDoor(null);
      dragStartPos.current = null;
      container.style.cursor = "default";
    };

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
    entities,
    actions,
    setWallsMeshRef,
  ]);

  return { contextMenu, setContextMenu, draggedDoor };
};
