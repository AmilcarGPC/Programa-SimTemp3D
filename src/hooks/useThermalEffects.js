import { useEffect } from "react";
import * as THREE from "three";

/**
 * Hook para aplicar efectos visuales basados en la temperatura
 * @param {THREE.Scene} scene - La escena donde aplicar los efectos
 * @param {number} tempExterna - Temperatura externa en °C
 * @param {number} tempInterna - Temperatura interna en °C
 */
export const useThermalEffects = (scene, tempExterna, tempInterna) => {
  useEffect(() => {
    if (!scene) return;

    // Ajustar color del cielo según temperatura externa
    // Frío (-20 a 10°C): tonos azul grisáceo
    // Templado (10 a 25°C): azul cielo normal
    // Calor (25 a 40°C): tonos más cálidos/amarillentos

    let skyColor;
    if (tempExterna < 10) {
      // Cielo frío - azul grisáceo
      const factor = THREE.MathUtils.clamp((tempExterna + 20) / 30, 0, 1);
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0xb0c4de), // Azul grisáceo frío
        new THREE.Color(0x87ceeb), // Azul cielo normal
        factor
      );
    } else if (tempExterna <= 25) {
      // Temperatura normal - azul cielo
      skyColor = new THREE.Color(0x87ceeb);
    } else {
      // Calor - tonos más cálidos
      const factor = THREE.MathUtils.clamp((tempExterna - 25) / 15, 0, 1);
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0x87ceeb), // Azul cielo normal
        new THREE.Color(0xffd89b), // Amarillo cálido
        factor
      );
    }

    scene.background = skyColor;
    if (scene.fog) {
      scene.fog.color = skyColor;
    }

    // Encontrar el piso interior y ajustar su color según temperatura interna
    // Frío: tonos azulados
    // Normal: beige cálido original
    // Calor: tonos rojizos/naranjas
    const floor = scene.children.find(
      (child) =>
        child.type === "Mesh" && child.geometry.type === "PlaneGeometry"
    );

    if (floor && floor.material) {
      let floorColor;
      const baseColor = new THREE.Color(0xcbb08a); // Color beige original

      if (tempInterna < 15) {
        // Frío - tonos azulados
        const factor = THREE.MathUtils.clamp((15 - tempInterna) / 15, 0, 0.3);
        floorColor = new THREE.Color().lerpColors(
          baseColor,
          new THREE.Color(0x9ab0c8), // Beige azulado
          factor
        );
      } else if (tempInterna <= 25) {
        // Temperatura confortable - color original
        floorColor = baseColor;
      } else {
        // Calor - tonos rojizos/naranjas
        const factor = THREE.MathUtils.clamp((tempInterna - 25) / 10, 0, 0.3);
        floorColor = new THREE.Color().lerpColors(
          baseColor,
          new THREE.Color(0xd4987a), // Beige rojizo
          factor
        );
      }

      floor.material.color = floorColor;
    }
  }, [scene, tempExterna, tempInterna]);
};
