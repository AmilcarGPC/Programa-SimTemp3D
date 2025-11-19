import * as THREE from "three";
import { snapToGrid, isOnFloor } from "../utils/entityUtils";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import { EntityBase } from "./EntityBase";
import { validateCandidate, buildOthers } from "../utils/entityCollision";

/**
 * Crea un calefactor profesional como un Group de Three.js
 * - tamaño base: 1 x 1 (ancho x profundidad)
 * - altura: 1.5
 * - diseño realista con rejillas, panel frontal y LED superior
 * - LED: indicador en la parte superior (rojo=apagado, azul=encendido)
 */
const width = 1;
const depth = 1;
const height = 1.5;

class HeaterEntity extends EntityBase {
  constructor({ position, id } = {}) {
    super({ type: "heater", id, position });
    // canonical state flag
    this.userData.isActive = false;

    // ===== CUERPO PRINCIPAL =====
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      roughness: 0.4,
      metalness: 0.2,
    });

    const bodyGeom = new THREE.BoxGeometry(width, height, depth);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = height / 2;
    body.castShadow = false;
    body.receiveShadow = true;
    this.add(body);

    // ===== PANEL FRONTAL DECORATIVO =====
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x2c2c2c,
      roughness: 0.3,
      metalness: 0.5,
    });

    const panelGeom = new THREE.BoxGeometry(width - 0.1, height - 0.2, 0.02);
    const panel = new THREE.Mesh(panelGeom, panelMat);
    panel.position.set(0, height / 2, depth / 2 + 0.01);
    panel.castShadow = false;
    panel.receiveShadow = true;
    this.add(panel);

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
      this.add(grill);
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
    foot.castShadow = false;
    foot.receiveShadow = true;
    this.add(foot);

    // ===== TAPA SUPERIOR =====
    const topMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.35,
      metalness: 0.3,
    });

    const topGeom = new THREE.BoxGeometry(width, 0.08, depth);
    const top = new THREE.Mesh(topGeom, topMat);
    top.position.y = height + 0.04;
    top.castShadow = false;
    top.receiveShadow = true;
    this.add(top);

    // ===== LED INDICADOR EN LA PARTE SUPERIOR =====
    const ledGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
    });
    const led = new THREE.Mesh(ledGeom, ledMat);
    led.position.set(0, height + 0.08, 0);
    led.castShadow = false;
    led.receiveShadow = false;
    this.add(led);

    // ===== LUZ DEL LED (PointLight) =====
    const ledLight = new THREE.PointLight(0xff0000, 0.5, 2.0);
    ledLight.position.set(0, height + 0.12, 0);
    ledLight.castShadow = false;
    this.add(ledLight);

    // Guardar referencias
    this.userData.led = led;
    this.userData.ledLight = ledLight;

    // Exponer métodos para toggle y animación
    this.onToggle = (instant = false) => {
      const isOn = !!this.userData.isActive;
      if (this.userData.led && this.userData.led.material) {
        if (isOn) {
          this.userData.led.material.color.set(0x0088ff);
          this.userData.led.material.emissive.set(0x0088ff);
          this.userData.led.material.emissiveIntensity = 1.2;
        } else {
          this.userData.led.material.color.set(0xff0000);
          this.userData.led.material.emissive.set(0xff0000);
          this.userData.led.material.emissiveIntensity = 0.6;
        }
      }

      if (this.userData.ledLight) {
        if (isOn) {
          this.userData.ledLight.color.set(0x0088ff);
          this.userData.ledLight.intensity = 1.0;
          this.userData.ledLight.visible = true;
        } else {
          this.userData.ledLight.color.set(0xff0000);
          this.userData.ledLight.intensity = 0.5;
          this.userData.ledLight.visible = true;
        }
      }
    };

    this.updateAnimation = () => {
      // placeholder para futuras animaciones (e.g., LED pulsante)
    };

    // Posicionar según posición (snap a grid)
    if (position) {
      const snapped = snapToGrid(position);
      this.position.set(snapped.x, 0, snapped.z);
      // Orient heater to face center (0,0) so its front always points inward
      try {
        const raw = Math.atan2(-this.position.x, -this.position.z);
        const step = Math.PI / 2; // 90 degrees
        const quant = Math.round(raw / step) * step;
        this.rotation.y = quant;
      } catch (e) {
        // defensive: ignore
      }
    }
  }

  validatePosition(world = null, basePos = null) {
    const pos = basePos ||
      this.userData.basePosition || { x: this.position.x, z: this.position.z };
    // Use centralized helper for floor checks
    if (!isOnFloor({ x: pos.x, z: pos.z })) return false;

    if (!world) return true;

    const candidateFull = {
      type: "heater",
      position: { x: pos.x, z: pos.z },
      id: this.userData.id,
    };

    try {
      const others = buildOthers(world, this.userData.id);
      return validateCandidate(candidateFull, others);
    } catch (e) {
      return false;
    }
  }

  onMove(oldBase, newBase, opts = {}) {
    try {
      const snapped = snapToGrid({ x: newBase.x, z: newBase.z });
      this.position.set(snapped.x, 0, snapped.z);
      // rotate to face center after move
      try {
        const raw = Math.atan2(-this.position.x, -this.position.z);
        const step = Math.PI / 2;
        this.rotation.y = Math.round(raw / step) * step;
      } catch (e) {}
    } catch (e) {
      // ignore
    }
  }
}

export const Heater = ({ position, id }) => {
  console.log("CH", position, id);
  return new HeaterEntity({ position, id });
};

export const toggleHeater = (heaterGroup, instant = false) => {
  if (!heaterGroup?.userData) return;
  if (typeof heaterGroup.toggle === "function") {
    heaterGroup.toggle(instant);
  }
};

export const updateHeaterAnimation = (heaterGroup) => {
  if (!heaterGroup?.userData) return;
  if (typeof heaterGroup.updateAnimation === "function") {
    heaterGroup.updateAnimation();
  }
};
