import { useEffect } from "react";
import * as THREE from "three";
import { LIGHTING_CONFIG, HOUSE_CONFIG } from "../config/sceneConfig";

/**
 * Hook para configurar toda la iluminación de la escena
 * @param {THREE.Scene} scene - La escena donde añadir las luces
 */
export const useLighting = (scene) => {
  useEffect(() => {
    if (!scene) return;

    const lights = [];

    // 1. Luz hemisférica - Simula iluminación de cielo/suelo
    const hemisphereLight = new THREE.HemisphereLight(
      LIGHTING_CONFIG.hemisphere.skyColor,
      LIGHTING_CONFIG.hemisphere.groundColor,
      LIGHTING_CONFIG.hemisphere.intensity
    );
    lights.push(hemisphereLight);
    scene.add(hemisphereLight);

    // 2. Luz del sol - Luz direccional principal
    const sunLight = new THREE.DirectionalLight(
      LIGHTING_CONFIG.sun.color,
      LIGHTING_CONFIG.sun.intensity
    );
    sunLight.position.set(
      LIGHTING_CONFIG.sun.position.x,
      LIGHTING_CONFIG.sun.position.y,
      LIGHTING_CONFIG.sun.position.z
    );

    // Configurar sombras
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = LIGHTING_CONFIG.sun.shadow.mapSize;
    sunLight.shadow.mapSize.height = LIGHTING_CONFIG.sun.shadow.mapSize;
    sunLight.shadow.camera.near = LIGHTING_CONFIG.sun.shadow.near;
    sunLight.shadow.camera.far = LIGHTING_CONFIG.sun.shadow.far;
    sunLight.shadow.camera.left = -LIGHTING_CONFIG.sun.shadow.cameraSize;
    sunLight.shadow.camera.right = LIGHTING_CONFIG.sun.shadow.cameraSize;
    sunLight.shadow.camera.top = LIGHTING_CONFIG.sun.shadow.cameraSize;
    sunLight.shadow.camera.bottom = -LIGHTING_CONFIG.sun.shadow.cameraSize;
    sunLight.shadow.radius = LIGHTING_CONFIG.sun.shadow.radius;
    sunLight.shadow.bias = LIGHTING_CONFIG.sun.shadow.bias;

    lights.push(sunLight);
    scene.add(sunLight);

    // 3. Luz ambiental - Fill light general
    const ambientLight = new THREE.AmbientLight(
      LIGHTING_CONFIG.ambient.color,
      LIGHTING_CONFIG.ambient.intensity
    );
    lights.push(ambientLight);
    scene.add(ambientLight);

    // 4. Luz de relleno interior - Para iluminar dentro de la casa
    const fillLight = new THREE.PointLight(
      LIGHTING_CONFIG.fill.color,
      LIGHTING_CONFIG.fill.intensity,
      LIGHTING_CONFIG.fill.distance
    );
    fillLight.position.set(0, HOUSE_CONFIG.wallHeight + 1, 0);
    fillLight.castShadow = false;
    lights.push(fillLight);
    scene.add(fillLight);

    // 5. Luces direccionales para iluminar paredes externas sin afectar interior
    if (LIGHTING_CONFIG.exterior) {
      LIGHTING_CONFIG.exterior.positions.forEach((pos) => {
        const exteriorLight = new THREE.DirectionalLight(
          LIGHTING_CONFIG.exterior.color,
          LIGHTING_CONFIG.exterior.intensity
        );
        exteriorLight.position.set(pos.x, pos.y, pos.z);
        exteriorLight.target.position.set(0, 0, 0);
        exteriorLight.castShadow = false;
        lights.push(exteriorLight);
        scene.add(exteriorLight);
        scene.add(exteriorLight.target);
      });
    }

    // Cleanup
    return () => {
      lights.forEach((light) => {
        scene.remove(light);
        light.dispose?.();
      });
    };
  }, [scene]);
};
