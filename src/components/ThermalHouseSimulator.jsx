import React, { useEffect, useRef, useState } from "react";
import Canvas3D from "./Canvas3D";
import ControlPanel from "./ControlPanel";
import MetricsBar from "./MetricsBar";
import { useThreeScene } from "../hooks/useThreeScene";
import { useLighting } from "../hooks/useLighting";
import { usePostProcessing } from "../hooks/usePostProcessing";
import { useWindowResize } from "../hooks/useWindowResize";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { useThermalEffects } from "../hooks/useThermalEffects";
import { createGround } from "../utils/createGround";
import { createTrees } from "../utils/createTree";
import { createHouse } from "../utils/createHouse";
import { TREE_POSITIONS, UI_CONFIG } from "../config/sceneConfig";

const ThermalHouseSimulator = () => {
  const containerRef = useRef(null);
  const [tempExterna, setTempExterna] = useState(
    UI_CONFIG.temperature.external.default
  );
  const [tempInterna, setTempInterna] = useState(
    UI_CONFIG.temperature.internal.default
  );

  // Hooks personalizados para gestionar la escena 3D
  const { scene, camera, renderer } = useThreeScene(containerRef);
  useLighting(scene);
  const composer = usePostProcessing(renderer, scene, camera);
  useWindowResize(camera, renderer, composer, containerRef);
  const fps = useAnimationLoop(composer);

  // Hook para efectos visuales térmicos
  useThermalEffects(scene, tempExterna, tempInterna);

  // Inicializar la escena con objetos 3D
  useEffect(() => {
    if (!scene) return;

    // Crear y añadir el suelo
    const ground = createGround();
    scene.add(ground);

    // Crear y añadir árboles
    const trees = createTrees(TREE_POSITIONS);
    trees.forEach((tree) => scene.add(tree));

    // Crear y añadir la casa
    const house = createHouse();
    scene.add(house.floor);
    scene.add(house.walls);
    house.markers.forEach((marker) => scene.add(marker));

    // Cleanup
    return () => {
      scene.remove(ground);
      trees.forEach((tree) => scene.remove(tree));
      scene.remove(house.floor);
      scene.remove(house.walls);
      house.markers.forEach((marker) => scene.remove(marker));

      // Liberar memoria
      ground.geometry.dispose();
      ground.material.dispose();
      trees.forEach((tree) => {
        tree.children.forEach((child) => {
          child.geometry.dispose();
          child.material.dispose();
        });
      });
      house.floor.geometry.dispose();
      house.floor.material.dispose();
      house.walls.geometry.dispose();
      house.walls.material.dispose();
    };
  }, [scene]);

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
      }}
    >
      <Canvas3D ref={containerRef} />

      <ControlPanel
        tempExterna={tempExterna}
        tempInterna={tempInterna}
        onTempExternaChange={setTempExterna}
        onTempInternaChange={setTempInterna}
      />

      <MetricsBar fps={fps} />
    </div>
  );
};

export default ThermalHouseSimulator;
