import * as THREE from "three";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import { DOOR_CONFIG } from "../config/entityConfig";
import { createWallMaterial } from "../utils/createHouse";
import { EntityBase } from "./EntityBase";
import { validateCandidate, buildOthers } from "../utils/entityCollision";
import {
  DOOR_DIRECTIONS,
  isOnWall,
  getDoorRotation,
  updateDoorPosition,
} from "../utils/entityUtils";

// DOOR_CONFIG ahora se exporta desde `src/config/sceneConfig.js`

/**
 * Direcciones válidas para las puertas (N, S, E, W)
 */
// DOOR_DIRECTIONS y utilidades relacionadas se encuentran ahora en `utils/doorUtils.js`

/**
 * Crea el marco de la puerta (low poly).
 * El marco ahora consiste en 3 extrusiones que sobresalen del muro.
 */
const DoorFrame = () => {
  const frameGroup = new THREE.Group();
  const { width, height, depth, frameThickness } = DOOR_CONFIG;
  const protrusion = 0.02; // Cuánto sobresale el marco del muro

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b7355, // Un color madera oscura para el marco
    roughness: 0.7,
    metalness: 0.1,
  });

  // Geometrías base
  const verticalGeom = new THREE.BoxGeometry(
    frameThickness,
    height,
    depth + protrusion * 2
  );
  const horizontalGeom = new THREE.BoxGeometry(
    width,
    frameThickness,
    depth + protrusion * 2
  );

  // Marco lateral izquierdo
  const leftFrame = new THREE.Mesh(verticalGeom, frameMaterial);
  leftFrame.position.set(-width / 2 + frameThickness / 2, height / 2, 0);
  leftFrame.castShadow = false;
  leftFrame.receiveShadow = true;

  // Marco lateral derecho
  const rightFrame = new THREE.Mesh(verticalGeom, frameMaterial);
  rightFrame.position.set(width / 2 - frameThickness / 2, height / 2, 0);
  rightFrame.castShadow = false;
  rightFrame.receiveShadow = true;

  // Marco superior
  const topFrame = new THREE.Mesh(horizontalGeom, frameMaterial);
  topFrame.position.set(0, height - frameThickness / 2, 0);
  topFrame.castShadow = false;
  topFrame.receiveShadow = true;

  frameGroup.add(leftFrame, rightFrame, topFrame);
  return frameGroup;
};

/**
 * Crea la tabla de la puerta (low poly)
 */
const DoorPanel = () => {
  const { width, height, doorThickness, frameThickness } = DOOR_CONFIG;

  // Dimensiones internas (dentro del marco)
  const panelWidth = width - frameThickness * 2 + 0.25;
  const panelHeight = height - frameThickness;

  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0xa0826d, // Madera clara
    roughness: 0.6,
    metalness: 0.0,
  });

  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(panelWidth, panelHeight, doorThickness),
    doorMaterial
  );
  doorPanel.position.y = panelHeight / 2 + frameThickness / 2;
  doorPanel.castShadow = false;
  doorPanel.receiveShadow = true;

  return doorPanel;
};

/**
 * Crea la manija de la puerta (low poly)
 */
const DoorHandle = () => {
  const { handleSize, doorThickness } = DOOR_CONFIG;

  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444, // Gris oscuro metálico
    roughness: 0.3,
    metalness: 0.8,
  });

  const handleGroup = new THREE.Group();

  // Cilindro horizontal para la manija
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(
      handleSize / 3,
      handleSize / 3,
      handleSize * 2,
      8
    ),
    handleMaterial
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.z = doorThickness / 2 + handleSize / 2;
  handle.castShadow = false;

  handleGroup.add(handle);
  return handleGroup;
};

/**
 * Crea la geometría CSG para hacer el hueco en la pared
 */
const DoorCutout = () => {
  const { width, height, depth } = DOOR_CONFIG;

  // Crear geometría para el corte con profundidad suficiente
  const cutoutGeometry = new THREE.BoxGeometry(
    width, // Más margen
    height, // Más margen
    Math.max(depth + 0.2, depth * 1.1) // profundidad ligeramente mayor que el muro
  );
  const cutoutBrush = new Brush(cutoutGeometry);

  // Elevar para coincidir con la puerta (0.15 es el grosor del piso + height/2)
  cutoutBrush.position.y = 0.15 + height / 2;
  cutoutBrush.updateMatrixWorld();

  return cutoutBrush;
};

// `isOnWall` and rotation helpers now live in `utils/entityUtils.js`

/**
 * Clase DoorEntity que encapsula la puerta y su comportamiento.
 */
class DoorEntity extends EntityBase {
  constructor({ position, direction, id } = {}) {
    super({ type: "door", id, position });
    if (!isOnWall({ ...position, direction })) {
      // marcar como inválida para que la fábrica pueda decidir
      this._invalid = true;
      return;
    }

    this.userData.type = "door";
    this.userData.id = id || this.userData.id;
    this.userData.direction = direction;
    // canonical state flag
    this.userData.isActive = false;
    this.userData.targetAngle = 0;
    this.userData.currentAngle = 0;

    // Crear componentes
    const frame = DoorFrame();
    const panel = DoorPanel();
    const handle = DoorHandle();

    const pivotGroup = new THREE.Group();
    const { width, frameThickness } = DOOR_CONFIG;

    const panelWidth = width - frameThickness * 2;
    // Reasignar geometría para ajustar al ancho interior
    try {
      if (panel.geometry) panel.geometry.dispose();
    } catch (e) { }
    panel.geometry = new THREE.BoxGeometry(
      panelWidth,
      panel.geometry.parameters.height,
      panel.geometry.parameters.depth
    );

    panel.position.x = -panelWidth / 2;
    handle.position.x = -panelWidth * 0.85;
    handle.position.y = 1.0;

    pivotGroup.add(panel, handle);
    pivotGroup.position.x = width / 2 - frameThickness;

    this.add(frame, pivotGroup);
    this.userData.pivotGroup = pivotGroup;

    // Posicionar (y fijo en 0.15)
    this.position.set(position.x, 0.15, position.z);
    if (direction === DOOR_DIRECTIONS.NORTH) {
      this.position.z += HOUSE_CONFIG.wallThickness / 2;
    } else if (direction === DOOR_DIRECTIONS.SOUTH) {
      this.position.z -= HOUSE_CONFIG.wallThickness / 2;
    } else if (direction === DOOR_DIRECTIONS.EAST) {
      this.position.x -= HOUSE_CONFIG.wallThickness / 2;
    } else if (direction === DOOR_DIRECTIONS.WEST) {
      this.position.x += HOUSE_CONFIG.wallThickness / 2;
    }

    this.rotation.y = getDoorRotation(direction);

    // Animación/Toggle handlers (based on canonical `isActive`)
    this.onToggle = (instant = false) => {
      const isOpen = !!this.userData.isActive;
      const target = isOpen ? DOOR_CONFIG.openAngle : 0;
      this.userData.targetAngle = target;
      // Apply instantly: set current angle and rotation immediately
      this.userData.currentAngle = target;
      if (this.userData.pivotGroup)
        this.userData.pivotGroup.rotation.y = target;
    };

    this.updateAnimation = () => {
      const pivot = this.userData.pivotGroup;
      if (!pivot) return;
      const currentAngle = this.userData.currentAngle || 0;
      const targetAngle = this.userData.targetAngle || 0;
      if (Math.abs(currentAngle - targetAngle) > 0.01) {
        const diff = targetAngle - currentAngle;
        const step = Math.sign(diff) * (DOOR_CONFIG.animationSpeed || 0.05);
        this.userData.currentAngle = currentAngle + step;
        if (Math.abs(this.userData.currentAngle - targetAngle) < 0.01) {
          this.userData.currentAngle = targetAngle;
        }
        pivot.rotation.y = this.userData.currentAngle;
      }
    };
  }

  // Para futuras integraciones con CSG, devolver un Brush posicionado
  getCutoutBrush() {
    const { width, height, depth } = DOOR_CONFIG;
    const cutoutGeometry = new THREE.BoxGeometry(
      width,
      height,
      Math.max(depth + 0.2, depth * 1.1)
    );
    const cut = new Brush(cutoutGeometry);
    cut.position.y = 0.15 + height / 2;
    cut.updateMatrixWorld();
    return cut;
  }

  // Valida la posición base (grid) para esta puerta. Se puede pasar
  // un contexto `world` para checks globales en el futuro.
  validatePosition(world = null, basePos = null) {
    const pos = basePos ||
      this.userData.basePosition || { x: this.position.x, z: this.position.z };
    if (
      !isOnWall({
        x: pos.x,
        z: pos.z,
        direction: this.userData.direction,
      })
    ) {
      return false;
    }

    if (!world) return true;

    const candidateFull = {
      type: "door",
      position: { x: pos.x, z: pos.z },
      direction: this.userData.direction,
      id: this.userData.id,
    };

    try {
      const others = buildOthers(world, this.userData.id);
      return validateCandidate(candidateFull, others);
    } catch (e) {
      return false;
    }
  }

  // Cuando la entidad se mueve (commit), aplicar ajustes adicionales
  // como offset según el grosor del muro y la altura Y.
  onMove(oldBase, newBase, opts = {}) {
    // reuse existing helper to set final world position and offsets
    try {
      updateDoorPosition(this, { x: newBase.x, z: newBase.z });
    } catch (e) {
      // ignore errors during onMove
    }
  }
}

export const Door = (options) => {
  const d = new DoorEntity(options);
  if (d._invalid) return null;
  return d;
};

/**
 * Aplica el corte CSG en las paredes para crear la abertura
 * @param {THREE.Mesh} wallsMesh - El mesh de las paredes
 * @param {Array} doorPositions - Array de posiciones de puertas
 * @returns {THREE.Mesh} - Nuevo mesh con los cortes aplicados
 */
export const applyDoorCutouts = (wallsMesh, doorPositions) => {
  if (!doorPositions || doorPositions.length === 0) {
    return wallsMesh;
  }

  const evaluator = new Evaluator();
  let resultMesh = wallsMesh;

  doorPositions.forEach((doorPos, index) => {
    const cutout = DoorCutout();

    // Posicionar el cutout (mantener la Y que ya tiene de DoorCutout)
    // Ajustar la posición del cutout para coincidir con la posición real de la puerta
    const halfDepth = DOOR_CONFIG.depth / 2;
    let cutX = doorPos.position.x;
    let cutZ = doorPos.position.z;

    switch (doorPos.direction) {
      case DOOR_DIRECTIONS.NORTH:
        cutZ = doorPos.position.z + halfDepth;
        break;
      case DOOR_DIRECTIONS.SOUTH:
        cutZ = doorPos.position.z - halfDepth;
        break;
      case DOOR_DIRECTIONS.EAST:
        cutX = doorPos.position.x - halfDepth;
        break;
      case DOOR_DIRECTIONS.WEST:
        cutX = doorPos.position.x + halfDepth;
        break;
      default:
        break;
    }

    cutout.position.x = cutX;
    cutout.position.z = cutZ;
    cutout.rotation.y = getDoorRotation(doorPos.direction);
    cutout.updateMatrixWorld();

    // Convertir el mesh actual a Brush
    const wallBrush = new Brush(resultMesh.geometry);
    wallBrush.material = resultMesh.material;
    wallBrush.position.copy(resultMesh.position);
    wallBrush.rotation.copy(resultMesh.rotation);
    wallBrush.scale.copy(resultMesh.scale);
    wallBrush.updateMatrixWorld();

    // Aplicar sustracción
    const newResult = evaluator.evaluate(wallBrush, cutout, SUBTRACTION);

    // Usar el material original (mantiene los shaders personalizados)
    newResult.material = wallsMesh.material;
    newResult.castShadow = wallsMesh.castShadow;
    newResult.receiveShadow = wallsMesh.receiveShadow;

    // Forzar actualización de la geometría
    newResult.geometry.attributes.position.needsUpdate = true;
    if (newResult.geometry.attributes.normal) {
      newResult.geometry.attributes.normal.needsUpdate = true;
    }
    if (newResult.geometry.attributes.uv) {
      newResult.geometry.attributes.uv.needsUpdate = true;
    }
    newResult.geometry.computeBoundingSphere();
    newResult.geometry.computeBoundingBox();

    resultMesh = newResult;
  });

  return resultMesh;
};

/**
 * Anima la apertura/cierre de una puerta
 * @param {THREE.Group} doorGroup - El grupo de la puerta
 */
export const updateDoorAnimation = (doorGroup) => {
  if (!doorGroup?.userData) return;
  if (typeof doorGroup.updateAnimation === "function") {
    doorGroup.updateAnimation();
  }
};

/**
 * Alterna el estado de la puerta (abierta/cerrada)
 * @param {THREE.Group} doorGroup
 * @param {boolean} instant - Si es true, cambia sin animación
 */
export const toggleDoor = (doorGroup, instant = false) => {
  if (!doorGroup?.userData) return;
  if (typeof doorGroup.toggle === "function") {
    doorGroup.toggle(instant);
  }
};

// `snapToGrid` moved to `utils/doorUtils.js`

// `updateDoorPosition` moved to `utils/doorUtils.js`
