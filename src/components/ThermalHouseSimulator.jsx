import React, { useEffect, useRef, useState } from "react";
import Canvas3D from "./Canvas3D";
import ControlPanel from "./ControlPanel";
import MetricsBar from "./MetricsBar";
import ProjectHeader from "./ProjectHeader";
import ContextMenu from "./ContextMenu";
import AlertNotification from "./AlertNotification";
import Tutorial from "./Tutorial";
import { TREE_POSITIONS, UI_CONFIG, HOUSE_CONFIG } from "../config/sceneConfig";

// Hooks
import { useThreeScene } from "../hooks/useThreeScene";
import { useLighting } from "../hooks/useLighting";
import { usePostProcessing } from "../hooks/usePostProcessing";
import { useWindowResize } from "../hooks/useWindowResize";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import useEntities from "../hooks/useEntities";
import { useSceneInteraction } from "../hooks/useSceneInteraction";

// Simulation
import { ThermalGrid } from "../simulation/ThermalGrid";
import { ThermalParticlesView } from "../simulation/ThermalParticlesView";

// Entities
import { Door, applyDoorCutouts } from "../entities/Door";
import { Window, applyWindowCutouts } from "../entities/Window";
import { Heater } from "../entities/Heater";
import { AirConditioner } from "../entities/AirConditioner";

// Utils
import { disposeObject } from "../utils/disposeUtils";
import { validateCandidate } from "../utils/entityCollision";
import { createGround } from "../utils/createGround";
import { createTrees } from "../utils/createTree";
import { createHouse } from "../utils/createHouse";

const ThermalHouseSimulator = () => {
  const containerRef = useRef(null);
  const [tempExterna, setTempExterna] = useState(
    UI_CONFIG.temperature.external.default
  );
  const [tempInterna, setTempInterna] = useState(
    UI_CONFIG.temperature.internal.default
  );

  useEffect(() => {
    setTempExterna(UI_CONFIG.temperature.external.default);
    setTempInterna(UI_CONFIG.temperature.internal.default);
  }, []);
  const [wallsMeshRef, setWallsMeshRef] = useState(null);

  const [showGrid, setShowGrid] = useState(false);
  const [gridDensity, setGridDensity] = useState(2);
  const [simulationSpeed, setSimulationSpeed] = useState(10);
  const gridRef = useRef(null);
  const particlesViewRef = useRef(null);
  const [avgInternalTemp, setAvgInternalTemp] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const lastAlertRef = useRef({ message: "", time: 0 });
  const [showTutorial, setShowTutorial] = useState(false);

  // Verificar si se debe mostrar el tutorial al cargar
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem("tutorial-completed");
    if (!tutorialCompleted) {
      setShowTutorial(true);
    }
  }, []);

  // Sistema de alertas
  const showAlert = React.useCallback((type, message, duration = 3000) => {
    const now = Date.now();
    const lastAlert = lastAlertRef.current;

    if (lastAlert.message === message && now - lastAlert.time < 1000) {
      return;
    }

    lastAlertRef.current = { message, time: now };
    const id = now + Math.random();
    setAlerts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const removeAlert = React.useCallback((id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  // Hooks personalizados para gestionar la escena 3D
  const { scene, camera, renderer } = useThreeScene(containerRef);
  useLighting(scene);
  const composer = usePostProcessing(renderer, scene, camera);
  useWindowResize(camera, renderer, composer, containerRef);

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
    showAlert,
  });

  // Ventanas
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
    showAlert,
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
    showAlert,
  });

  // Hook para gestionar aires acondicionados (montados en pared)
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
    showAlert,
  });

  // Callback de animación para actualizar simulación
  const handleFrame = React.useCallback(
    (deltaTime) => {
      if (gridRef.current) {
        gridRef.current.update(
          deltaTime,
          tempExterna,
          tempInterna,
          doors,
          windows,
          heaters,
          acs,
          simulationSpeed
        );
      }
      if (particlesViewRef.current && showGrid) {
        particlesViewRef.current.update();
      }

      // calcular temperatura interior promedio (partículas dentro del interior)
      try {
        if (gridRef.current && gridRef.current.particles) {
          const particles = gridRef.current.particles;
          const houseHalfSize = HOUSE_CONFIG.size / 2;
          const wallThickness = HOUSE_CONFIG.wallThickness;
          const innerHalf = houseHalfSize + wallThickness;
          let sum = 0;
          let count = 0;
          for (const p of particles) {
            if (
              p.x > -innerHalf &&
              p.x < innerHalf &&
              p.z > -innerHalf &&
              p.z < innerHalf
            ) {
              sum += p.temp;
              count += 1;
            }
          }
          if (count > 0) setAvgInternalTemp(sum / count);
        }
      } catch (e) {}
    },
    [
      tempExterna,
      tempInterna,
      showGrid,
      doors,
      windows,
      heaters,
      acs,
      simulationSpeed,
    ]
  );

  useAnimationLoop(composer, handleFrame);

  useEffect(() => {
    if (!scene) return;

    const grid = new ThermalGrid(-15, 15, -10, 10, gridDensity);
    gridRef.current = grid;

    // Crear Vista
    const view = new ThermalParticlesView(grid);
    particlesViewRef.current = view;
    scene.add(view.mesh);
    // Asegurar que el mesh de partículas respete la visibilidad actual
    if (view.mesh) view.mesh.visible = !!showGrid;

    return () => {
      if (view) {
        scene.remove(view.mesh);
        view.dispose();
      }
    };
  }, [scene, gridDensity]); // Re-crear cuando cambia la densidad

  // Si cambian los sliders externos/internos, reiniciar el estado del grid térmico
  useEffect(() => {
    if (gridRef.current) {
      try {
        gridRef.current.reset(tempExterna, tempInterna);
      } catch (e) {
        console.warn("Failed to reset thermal grid:", e);
      }
    }
    if (particlesViewRef.current) {
      try {
        particlesViewRef.current.update();
      } catch (e) {
        // ignorar
      }
    }
  }, [tempExterna, tempInterna]);

  useEffect(() => {
    if (particlesViewRef.current && particlesViewRef.current.mesh) {
      particlesViewRef.current.mesh.visible = showGrid;
    }
  }, [showGrid]);

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

    return () => {
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
        console.warn("Cleanup error:", e);
      }
    };
  }, [scene]);

  // Sistema de interacción con mouse (clic derecho, drag & drop, clic en puerta)
  const { contextMenu, setContextMenu, draggedDoor } = useSceneInteraction({
    scene,
    camera,
    containerRef,
    wallsMeshRef,
    setWallsMeshRef,
    entities: { doors, windows, heaters, acs },
    actions: {
      door: {
        toggle: toggleDoorState,
        commitMove: commitMoveDoor,
        updatePosInState: updateDoorPositionInState,
        previewMove: previewMoveDoor,
      },
      window: {
        toggle: toggleWindowState,
        commitMove: commitMoveWindow,
        updatePosInState: updateWindowPositionInState,
        previewMove: previewMoveWindow,
      },
      heater: {
        toggle: toggleHeaterState,
        commitMove: commitMoveHeater,
        updatePosInState: updateHeaterPositionInState,
      },
      aircon: {
        toggle: toggleAirConditionerState,
        commitMove: commitMoveAircon,
        updatePosInState: updateACPositionInState,
        previewMove: previewMoveAircon,
      },
    },
  });

  // Manejar selección de componente desde el menú contextual
  const handleSelectComponent = (componentType) => {
    if (!contextMenu) return;

    const strategies = {
      door: {
        createCandidate: () => ({
          position: contextMenu.wallPosition,
          direction: contextMenu.direction,
        }),
        addFn: addDoor,
        label: "puerta",
        log: "🚪 Puerta añadida desde menú contextual",
        errorMsg: "No se puede añadir la puerta: posición ocupada",
      },
      window: {
        createCandidate: () => ({
          position: contextMenu.wallPosition,
          direction: contextMenu.direction,
        }),
        addFn: addWindow,
        label: "ventana",
        log: "🪟 Ventana añadida desde menú contextual",
        errorMsg: "No se puede añadir la ventana: posición ocupada",
      },
      heater: {
        createCandidate: () => {
          if (!contextMenu.floorPosition) return null;
          return { position: contextMenu.floorPosition };
        },
        addFn: addHeater,
        label: "calefactor",
        log: "🔥 Calefactor añadido desde menú contextual",
        errorMsg: "No se puede añadir el calefactor: posición ocupada",
        checkFloor: true,
      },
      aircon: {
        createCandidate: () => ({
          position: contextMenu.wallPosition,
          direction: contextMenu.direction,
        }),
        addFn: addAirConditioner,
        label: "aire acondicionado",
        log: "❄️ AC añadido desde menú contextual",
        errorMsg: "No se puede añadir el aire acondicionado: posición ocupada",
      },
    };

    const strategy = strategies[componentType];
    if (!strategy) return;

    if (strategy.checkFloor && !contextMenu.floorPosition) {
      console.warn(
        "No hay posición de suelo disponible para colocar el calefactor"
      );
      return;
    }

    const candidateData = strategy.createCandidate();
    if (!candidateData) return;

    const candidateFull = { type: componentType, ...candidateData };
    const allEntities = [...doors, ...windows, ...heaters, ...acs];

    if (!validateCandidate(candidateFull, allEntities)) {
      console.warn(
        `No se puede añadir ${strategy.label}: conflicto con otra entidad`
      );
      showAlert("error", strategy.errorMsg);
      return;
    }

    const entity = strategy.addFn(candidateData);
    if (entity) {
      console.log(strategy.log);
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

  useEffect(() => {
    if (!scene || !wallsMeshRef) return;
    if (draggedDoor && draggedDoor.userData?.isDragging) return;

    scene.remove(wallsMeshRef);
    disposeObject(wallsMeshRef);

    const house = createHouse();

    let newWalls = house.walls;
    if (doors.length > 0) {
      newWalls = applyDoorCutouts(newWalls, doors);
    }
    if (windows && windows.length > 0) {
      newWalls = applyWindowCutouts(newWalls, windows);
    }
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
        ["--side-panel-width"]: `${UI_CONFIG.sidePanel.width}px`,
        ["--footer-height"]: `${UI_CONFIG.footer.height}px`,
      }}
    >
      <Canvas3D ref={containerRef} />

      <ProjectHeader isDarkMode={isDarkMode} />

      <ControlPanel
        tempExterna={tempExterna}
        tempInterna={tempInterna}
        onTempExternaChange={setTempExterna}
        onTempInternaChange={setTempInterna}
        showGrid={showGrid}
        onShowGridChange={setShowGrid}
        gridDensity={gridDensity}
        onGridDensityChange={setGridDensity}
        simulationSpeed={simulationSpeed}
        onSimulationSpeedChange={setSimulationSpeed}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenTutorial={() => setShowTutorial(true)}
        onReset={() => {
          setTempExterna(UI_CONFIG.temperature.external.default);
          setTempInterna(UI_CONFIG.temperature.internal.default);
          if (gridRef.current && typeof gridRef.current.reset === "function") {
            try {
              gridRef.current.reset(
                UI_CONFIG.temperature.external.default,
                UI_CONFIG.temperature.internal.default
              );
            } catch (e) {
              console.warn("Grid reset failed:", e);
            }
          }
          if (
            particlesViewRef.current &&
            typeof particlesViewRef.current.update === "function"
          ) {
            try {
              particlesViewRef.current.update();
            } catch (e) {
              // ignore
            }
          }
        }}
      />

      <MetricsBar avgInternal={avgInternalTemp} isDarkMode={isDarkMode} />

      <ContextMenu
        position={contextMenu}
        onClose={() => setContextMenu(null)}
        onSelectComponent={handleSelectComponent}
        onDeleteObject={handleDeleteObject}
        isDarkMode={isDarkMode}
      />

      {/* Notificaciones de alerta */}
      <div
        style={{
          position: "fixed",
          top: "80px",
          right: "24px",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          pointerEvents: "none",
        }}
      >
        {alerts.map((alert) => (
          <div key={alert.id} style={{ pointerEvents: "auto" }}>
            <AlertNotification
              type={alert.type}
              message={alert.message}
              duration={alert.duration}
              onClose={() => removeAlert(alert.id)}
              isDarkMode={isDarkMode}
            />
          </div>
        ))}
      </div>

      {/* Tutorial */}
      {showTutorial && (
        <Tutorial
          isDarkMode={isDarkMode}
          onClose={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
};

export default ThermalHouseSimulator;
