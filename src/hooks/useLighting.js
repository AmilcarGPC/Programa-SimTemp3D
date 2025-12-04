import { useEffect } from "react";
import * as THREE from "three";
import { LIGHTING_CONFIG, HOUSE_CONFIG } from "../config/sceneConfig";

export const useLighting = (scene) => {
  useEffect(() => {
    if (!scene) return;

    const lights = [];

    // Simula iluminación de cielo/suelo
    const hemisphereLight = new THREE.HemisphereLight(
      LIGHTING_CONFIG.hemisphere.skyColor,
      LIGHTING_CONFIG.hemisphere.groundColor,
      LIGHTING_CONFIG.hemisphere.intensity
    );
    lights.push(hemisphereLight);
    scene.add(hemisphereLight);

    // Luz direccional principal
    const sunLight = new THREE.DirectionalLight(
      LIGHTING_CONFIG.sun.color,
      LIGHTING_CONFIG.sun.intensity
    );
    sunLight.position.set(
      LIGHTING_CONFIG.sun.position.x,
      LIGHTING_CONFIG.sun.position.y,
      LIGHTING_CONFIG.sun.position.z
    );

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

    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(
      LIGHTING_CONFIG.ambient.color,
      LIGHTING_CONFIG.ambient.intensity
    );
    lights.push(ambientLight);
    scene.add(ambientLight);

    // Luz de relleno interior
    const fillLight = new THREE.PointLight(
      LIGHTING_CONFIG.fill.color,
      LIGHTING_CONFIG.fill.intensity,
      LIGHTING_CONFIG.fill.distance
    );
    fillLight.position.set(0, HOUSE_CONFIG.wallHeight + 1, 0);
    fillLight.castShadow = false;
    lights.push(fillLight);
    scene.add(fillLight);

    // Luces direccionales para iluminar paredes externas sin afectar interior
    const exteriorTargets = [];
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
        exteriorTargets.push(exteriorLight.target);
      });
    }

    return () => {
      lights.forEach((light) => {
        scene.remove(light);
        light.dispose?.();
      });
      exteriorTargets.forEach((t) => {
        try {
          scene.remove(t);
        } catch (e) {}
      });
    };
  }, [scene]);
};
