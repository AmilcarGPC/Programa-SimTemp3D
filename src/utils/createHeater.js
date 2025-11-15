import * as THREE from "three";
import { snapToGrid } from "./doorUtils";
import { HOUSE_CONFIG } from "../config/sceneConfig";

/**
 * Crea un calefactor profesional como un Group de Three.js
 * - tamaño base: 1 x 1 (ancho x profundidad)
 * - altura: 1.5
 * - diseño realista con rejillas, panel frontal y LED superior
 * - LED: indicador en la parte superior (rojo=apagado, azul=encendido)
 */
export const createHeater = ({ position, id }) => {
  const width = 1;
  const depth = 1;
  const height = 1.5;

  const group = new THREE.Group();
  group.userData = {
    type: "heater",
    id: id || `heater_${Date.now()}`,
    isOn: false,
  };

  // ===== CUERPO PRINCIPAL =====
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe8e8e8, // Blanco/gris claro (típico de calefactores modernos)
    roughness: 0.4,
    metalness: 0.2,
  });

  const bodyGeom = new THREE.BoxGeometry(width, height, depth);
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // ===== PANEL FRONTAL DECORATIVO =====
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x2c2c2c, // Gris oscuro
    roughness: 0.3,
    metalness: 0.5,
  });

  const panelGeom = new THREE.BoxGeometry(width - 0.1, height - 0.2, 0.02);
  const panel = new THREE.Mesh(panelGeom, panelMat);
  panel.position.set(0, height / 2, depth / 2 + 0.01);
  panel.castShadow = false;
  panel.receiveShadow = true;
  group.add(panel);

  // ===== REJILLAS HORIZONTALES (simulan salida de aire) =====
  const grillMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
    metalness: 0.3,
  });

  const grillCount = 8;
  const grillHeight = 0.03;
  const grillSpacing = (height - 0.4) / grillCount;

  for (let i = 0; i < grillCount; i++) {
    const grillGeom = new THREE.BoxGeometry(width - 0.15, grillHeight, 0.01);
    const grill = new THREE.Mesh(grillGeom, grillMat);
    grill.position.set(0, 0.3 + i * grillSpacing, depth / 2 + 0.02);
    grill.castShadow = false;
    group.add(grill);
  }

  // ===== BASE/PIES =====
  const footMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    roughness: 0.7,
    metalness: 0.1,
  });

  const footGeom = new THREE.BoxGeometry(width - 0.1, 0.05, depth - 0.1);
  const foot = new THREE.Mesh(footGeom, footMat);
  foot.position.y = 0.025;
  foot.castShadow = true;
  foot.receiveShadow = true;
  group.add(foot);

  // ===== TAPA SUPERIOR =====
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.35,
    metalness: 0.3,
  });

  const topGeom = new THREE.BoxGeometry(width, 0.08, depth);
  const top = new THREE.Mesh(topGeom, topMat);
  top.position.y = height + 0.04;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // ===== LED INDICADOR EN LA PARTE SUPERIOR =====
  const ledGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xff0000, // Rojo inicial (apagado)
    emissive: 0xff0000, // Emisión roja
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.1,
  });
  const led = new THREE.Mesh(ledGeom, ledMat);
  led.position.set(0, height + 0.08, 0); // Centrado en la parte superior
  led.castShadow = false;
  led.receiveShadow = false;
  group.add(led);

  // ===== LUZ DEL LED (PointLight) =====
  const ledLight = new THREE.PointLight(0xff0000, 0.5, 2.0);
  ledLight.position.set(0, height + 0.12, 0);
  ledLight.castShadow = false;
  group.add(ledLight);

  // Guardar referencias
  group.userData.led = led;
  group.userData.ledLight = ledLight;

  // Posicionar el grupo según posición pasada (snap a grid)
  if (position) {
    const snapped = snapToGrid(position);
    group.position.set(snapped.x, 0, snapped.z);
  }

  return group;
};

export const toggleHeater = (heaterGroup) => {
  if (!heaterGroup || !heaterGroup.userData) return;
  const isOn = !heaterGroup.userData.isOn;
  heaterGroup.userData.isOn = isOn;

  const led = heaterGroup.userData.led;
  const light = heaterGroup.userData.ledLight;

  if (led && led.material) {
    if (isOn) {
      // Azul cuando está encendido
      led.material.color.set(0x0088ff);
      led.material.emissive.set(0x0088ff);
      led.material.emissiveIntensity = 1.2;
    } else {
      // Rojo cuando está apagado
      led.material.color.set(0xff0000);
      led.material.emissive.set(0xff0000);
      led.material.emissiveIntensity = 0.6;
    }
  }

  if (light) {
    if (isOn) {
      light.color.set(0x0088ff); // Luz azul
      light.intensity = 1.0;
      light.visible = true;
    } else {
      light.color.set(0xff0000); // Luz roja
      light.intensity = 0.5;
      light.visible = true;
    }
  }
};

export const updateHeaterAnimation = (heaterGroup) => {
  // placeholder for future animations (e.g., pulsing LED)
  if (!heaterGroup || !heaterGroup.userData) return;
  // If needed, could implement smooth transitions here
};
