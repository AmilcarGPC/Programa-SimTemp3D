import * as THREE from "three";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import { AC_CONFIG } from "../config/entityConfig";
import { EntityBase } from "./EntityBase";
import {
  WINDOW_DIRECTIONS,
  isOnWall,
  getWindowRotation,
} from "../utils/entityUtils";
import { validateCandidate, buildOthers } from "../utils/entityCollision";

const AirConditionerBody = () => {
  const { width, height, depth } = AC_CONFIG;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf5f7f8,
    roughness: 0.35,
    metalness: 0.1,
  });

  const bodyGeom = new THREE.BoxGeometry(width, height, depth);
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.castShadow = false;
  body.receiveShadow = true;
  body.position.y = height / 2;
  return body;
};

const AirConditionerGrille = () => {
  const { width, height, depth } = AC_CONFIG;
  const grilleGroup = new THREE.Group();
  const grilleMat = new THREE.MeshStandardMaterial({
    color: 0x1f2326,
    roughness: 0.8,
    metalness: 0.3,
  });

  const slatCount = 10;
  const slatThickness = 0.02;
  const slatSpacing = (height - 0.2) / slatCount;
  const slatWidth = width - 0.18;

  for (let i = 0; i < slatCount; i++) {
    const g = new THREE.Mesh(
      new THREE.BoxGeometry(slatWidth, slatThickness, 0.02),
      grilleMat
    );
    g.position.set(0, 0.12 + i * slatSpacing, depth / 2 + 0.01);
    g.receiveShadow = false;
    grilleGroup.add(g);
  }
  return grilleGroup;
};

const AirConditionerTop = () => {
  const { width, height, depth } = AC_CONFIG;
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xeaeff1,
    roughness: 0.4,
    metalness: 0.05,
  });
  const topGeom = new THREE.BoxGeometry(width - 0.2, 0.04, depth - 0.2);
  const top = new THREE.Mesh(topGeom, topMat);
  top.position.y = height + 0.02;
  return top;
};

const AirConditionerLed = () => {
  const { ledRadius, ledHeightOffset } = AC_CONFIG;
  const ledGeom = new THREE.CylinderGeometry(ledRadius, ledRadius, 0.04, 12);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.2,
  });
  const led = new THREE.Mesh(ledGeom, ledMat);
  led.rotation.x = Math.PI / 2;
  led.position.set(
    AC_CONFIG.width / 2 - 0.18,
    AC_CONFIG.height + ledHeightOffset,
    0
  );
  led.castShadow = false;

  const ledLight = new THREE.PointLight(
    0xff0000,
    0.5,
    AC_CONFIG.ledLightDistance
  );
  ledLight.position.copy(led.position);
  ledLight.castShadow = false;

  return { led, ledLight };
};

class AirConditionerEntity extends EntityBase {
  constructor({ position, direction, id } = {}) {
    super({ type: "aircon", id, position });
    this.userData.direction = direction;
    this.userData.isActive = false;

    const body = AirConditionerBody();
    const grille = AirConditionerGrille();
    const top = AirConditionerTop();
    const { led, ledLight } = AirConditionerLed();

    this.add(body, grille, top, led, ledLight);

    this.userData.led = led;
    this.userData.ledLight = ledLight;
    this.userData.grille = grille;
    this.userData.width = AC_CONFIG.width;
    this.userData.depth = AC_CONFIG.depth;

    const yPos = 2;
    if (position) {
      this.position.set(position.x, yPos, position.z);
    } else {
      this.position.y = yPos;
    }

    const inset = HOUSE_CONFIG.wallThickness + AC_CONFIG.depth / 2;
    if (this.userData.direction === WINDOW_DIRECTIONS.NORTH) {
      this.position.z += inset;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.SOUTH) {
      this.position.z -= inset;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.EAST) {
      this.position.x -= inset;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.WEST) {
      this.position.x += inset;
    }

    this.rotation.y = getWindowRotation(this.userData.direction);

    this.onToggle = (instant = false) => {
      const isOn = !!this.userData.isActive;
      const led = this.userData.led;
      const ledLight = this.userData.ledLight;
      if (led && led.material) {
        if (isOn) {
          led.material.color.set(0x66ccff);
          led.material.emissive.set(0x66ccff);
          led.material.emissiveIntensity = 1.2;
        } else {
          led.material.color.set(0xff0000);
          led.material.emissive.set(0xff0000);
          led.material.emissiveIntensity = 0.3;
        }
      }
      if (ledLight) {
        if (isOn) {
          ledLight.color.set(0x66ccff);
          ledLight.intensity = 1.0;
          ledLight.visible = true;
        } else {
          ledLight.color.set(0xff0000);
          ledLight.intensity = 0.2;
          ledLight.visible = true;
        }
      }
    };

    this.updateAnimation = () => {
      const led = this.userData.led;
      const light = this.userData.ledLight;
      if (!led || !light) return;
      if (this.userData.isActive) {
        const t = Date.now() * 0.001;
        const pulse =
          0.8 +
          Math.abs(Math.sin(t * Math.PI * AC_CONFIG.animationSpeed)) * 0.6;
        led.material.emissiveIntensity = pulse;
        light.intensity = THREE.MathUtils.clamp(pulse * 0.9, 0.2, 1.5);
      } else {
        led.material.emissiveIntensity = 0.3;
        light.intensity = 0.2;
      }
    };
  }

  getCutoutBrush() {
    return null;
  }

  validatePosition(world = null, basePos = null) {
    const pos = basePos ||
      this.userData.basePosition || { x: this.position.x, z: this.position.z };

    const candidate = {
      x: pos.x,
      z: pos.z,
      direction: this.userData.direction,
    };
    if (this.userData.direction === WINDOW_DIRECTIONS.NORTH) {
      candidate.z = -5;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.SOUTH) {
      candidate.z = 5;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.EAST) {
      candidate.x = 5;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.WEST) {
      candidate.x = -5;
    }

    if (!isOnWall(candidate)) return false;

    if (!world) return true;

    const candidateFull = {
      type: "aircon",
      position: { x: candidate.x, z: candidate.z },
      direction: candidate.direction,
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
    const yPos = 2;
    this.position.set(newBase.x, yPos, newBase.z);
    const inset = HOUSE_CONFIG.wallThickness + AC_CONFIG.depth / 2;
    if (this.userData.direction === WINDOW_DIRECTIONS.NORTH) {
      this.position.z = -5 + inset;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.SOUTH) {
      this.position.z = 5 - inset;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.EAST) {
      this.position.x = 5 - inset;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.WEST) {
      this.position.x = -5 + inset;
    }
  }
}

export const AirConditioner = ({ position, direction, id } = {}) => {
  if (AC_CONFIG.height > HOUSE_CONFIG.wallHeight) {
    console.warn("AC height exceeds wall height, cannot create unit");
    return null;
  }

  if (!isOnWall({ ...position, direction })) {
    console.warn("Invalid AC position:", position, direction);
    return null;
  }
  return new AirConditionerEntity({ position, direction, id });
};

export const toggleAirConditioner = (acGroup, instant = false) => {
  if (!acGroup?.userData) return;
  if (typeof acGroup.toggle === "function") {
    acGroup.toggle(instant);
  }
};

export const updateAirConditionerAnimation = (acGroup) => {
  if (!acGroup?.userData) return;
  if (typeof acGroup.updateAnimation === "function") {
    acGroup.updateAnimation();
  }
};
