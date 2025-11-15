import * as THREE from "three";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { HOUSE_CONFIG, DOOR_CONFIG } from "../config/sceneConfig";
import { createWallMaterial } from "./createHouse";
import {
  DOOR_DIRECTIONS,
  isValidDoorPosition,
  getDoorRotation,
  snapToGrid,
  updateDoorPosition,
} from "./doorUtils";

// DOOR_CONFIG ahora se exporta desde `src/config/sceneConfig.js`

/**
 * Direcciones válidas para las puertas (N, S, E, W)
 */
// DOOR_DIRECTIONS y utilidades relacionadas se encuentran ahora en `utils/doorUtils.js`

/**
 * Crea el marco de la puerta (low poly).
 * El marco ahora consiste en 3 extrusiones que sobresalen del muro.
 */
const createDoorFrame = () => {
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
const createDoorPanel = () => {
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
const createDoorHandle = () => {
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
const createDoorCutout = () => {
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

// `isValidDoorPosition` moved to `utils/doorUtils.js`

// `getDoorRotation` moved to `utils/doorUtils.js`

/**
 * Crea una puerta completa con frame, panel y manija
 * @param {Object} options - { position: {x, z}, direction, id }
 * @returns {THREE.Group}
 */
export const createDoor = (options) => {
  const { position, direction, id } = options;

  if (!isValidDoorPosition({ ...position, direction })) {
    console.warn("Invalid door position:", position, direction);
    return null;
  }

  const doorGroup = new THREE.Group();
  doorGroup.userData = {
    type: "door",
    id: id || `door_${Date.now()}`,
    direction,
    isOpen: false,
    targetAngle: 0,
    currentAngle: 0,
  };

  // Crear componentes de la puerta
  const frame = createDoorFrame();
  const panel = createDoorPanel();
  const handle = createDoorHandle();

  // Grupo pivotante para la puerta (rota sobre el eje Y en el borde DERECHO)
  const pivotGroup = new THREE.Group();
  const { width, frameThickness } = DOOR_CONFIG;

  // Ancho del panel para que quepa dentro del marco
  const panelWidth = width - frameThickness * 2;
  panel.geometry.dispose(); // Liberar memoria de la geometría anterior
  panel.geometry = new THREE.BoxGeometry(
    panelWidth,
    panel.geometry.parameters.height,
    panel.geometry.parameters.depth
  );

  // El panel se extiende hacia la izquierda desde el pivote (su borde derecho)
  panel.position.x = -panelWidth / 2;

  // Posicionar manija en el panel
  handle.position.x = -panelWidth * 0.85;
  handle.position.y = 1.0; // Altura de la manija

  // El panel y la manija están centrados en el eje Z (0) por defecto,
  // lo que los alinea con el centro del marco.
  pivotGroup.add(panel, handle);

  // Posicionar el pivote en el borde derecho interno del marco
  pivotGroup.position.x = width / 2 - frameThickness;

  doorGroup.add(frame, pivotGroup);
  doorGroup.userData.pivotGroup = pivotGroup;

  doorGroup.position.set(position.x, 0.15, position.z);

  // Añadir desplazamiento para alinear con el muro usando wallThickness dependiendo de si es norte, sur, este u oeste
  if (direction === DOOR_DIRECTIONS.NORTH) {
    doorGroup.position.z += HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === DOOR_DIRECTIONS.SOUTH) {
    doorGroup.position.z -= HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === DOOR_DIRECTIONS.EAST) {
    doorGroup.position.x -= HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === DOOR_DIRECTIONS.WEST) {
    doorGroup.position.x += HOUSE_CONFIG.wallThickness / 2;
  }

  // Posicionar y rotar la puerta según la dirección
  doorGroup.rotation.y = getDoorRotation(direction);

  return doorGroup;
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
    const cutout = createDoorCutout();

    // Posicionar el cutout (mantener la Y que ya tiene de createDoorCutout)
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
  if (!doorGroup || !doorGroup.userData) return;

  const { pivotGroup, currentAngle = 0, targetAngle = 0 } = doorGroup.userData;

  if (!pivotGroup) return;

  if (Math.abs(currentAngle - targetAngle) > 0.01) {
    const diff = targetAngle - currentAngle;
    const step = Math.sign(diff) * (DOOR_CONFIG.animationSpeed || 0.05);

    doorGroup.userData.currentAngle =
      (doorGroup.userData.currentAngle || 0) + step;

    if (Math.abs(doorGroup.userData.currentAngle - targetAngle) < 0.01) {
      doorGroup.userData.currentAngle = targetAngle;
    }

    pivotGroup.rotation.y = doorGroup.userData.currentAngle;
  }
};

/**
 * Alterna el estado de la puerta (abierta/cerrada)
 * @param {THREE.Group} doorGroup
 * @param {boolean} instant - Si es true, cambia sin animación
 */
export const toggleDoor = (doorGroup, instant = false) => {
  if (!doorGroup || !doorGroup.userData) return;

  doorGroup.userData.isOpen = !doorGroup.userData.isOpen;
  doorGroup.userData.targetAngle = doorGroup.userData.isOpen
    ? DOOR_CONFIG.openAngle
    : 0;

  if (instant && doorGroup.userData.pivotGroup) {
    doorGroup.userData.currentAngle = doorGroup.userData.targetAngle;
    doorGroup.userData.pivotGroup.rotation.y = doorGroup.userData.targetAngle;
  }
};

// `snapToGrid` moved to `utils/doorUtils.js`

// `updateDoorPosition` moved to `utils/doorUtils.js`
