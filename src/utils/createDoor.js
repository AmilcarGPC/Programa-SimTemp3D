import * as THREE from "three";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import { createWallMaterial } from "./createHouse";

/**
 * Configuración de la puerta
 */
export const DOOR_CONFIG = {
  width: 2.0, // Ancho de la puerta
  height: 2.3, // Alto de la puerta
  depth: HOUSE_CONFIG.wallThickness, // Profundidad = grosor del muro
  frameThickness: 0.1, // Grosor del marco
  doorThickness: 0.08, // Grosor de la tabla de la puerta
  handleSize: 0.15, // Tamaño de la manija
  openAngle: Math.PI / 2, // +90 grados para abrir hacia adentro (pivote en lado derecho)
  animationSpeed: 0.05, // Velocidad de apertura/cierre
};

/**
 * Direcciones válidas para las puertas (N, S, E, W)
 */
export const DOOR_DIRECTIONS = {
  NORTH: "north", // Pared frontal (z negativo)
  SOUTH: "south", // Pared trasera (z positivo)
  EAST: "east", // Pared derecha (x positivo)
  WEST: "west", // Pared izquierda (x negativo)
};

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
    width + 0.025, // Más margen
    height + 0.025, // Más margen
    Math.max(depth + 0.2, depth * 1.1) // profundidad ligeramente mayor que el muro
  );
  const cutoutBrush = new Brush(cutoutGeometry);

  // Elevar para coincidir con la puerta (0.15 es el grosor del piso + height/2)
  cutoutBrush.position.y = 0.15 + height / 2;
  cutoutBrush.updateMatrixWorld();

  return cutoutBrush;
};

/**
 * Valida si una posición es válida para colocar una puerta
 * @param {Object} position - { x, z, direction }
 * @returns {boolean}
 */
export const isValidDoorPosition = (position) => {
  const { x, z, direction } = position;
  const { size } = HOUSE_CONFIG;
  const halfSize = size / 2;
  const tolerance = 0.1;

  // Verificar que la posición esté en un muro válido
  switch (direction) {
    case DOOR_DIRECTIONS.NORTH:
      // Muro frontal: z ≈ -halfSize, x entre -halfSize y +halfSize (excluyendo esquinas)
      const isZValid = Math.abs(z + halfSize) < tolerance;
      const isXValid = x > -halfSize + 1 && x < halfSize - 1;
      return isZValid && isXValid;

    case DOOR_DIRECTIONS.SOUTH:
      // Muro trasero: z ≈ halfSize, x entre -halfSize y +halfSize (excluyendo esquinas)
      return (
        Math.abs(z - halfSize) < tolerance &&
        x > -halfSize + 1 &&
        x < halfSize - 1
      );

    case DOOR_DIRECTIONS.EAST:
      // Muro derecho: x ≈ halfSize, z entre -halfSize y +halfSize (excluyendo esquinas)
      return Math.abs(x - halfSize) < tolerance && Math.abs(z) < halfSize - 1;

    case DOOR_DIRECTIONS.WEST:
      // Muro izquierdo: x ≈ -halfSize, z entre -halfSize y +halfSize (excluyendo esquinas)
      return Math.abs(x + halfSize) < tolerance && Math.abs(z) < halfSize - 1;

    default:
      return false;
  }
};

/**
 * Obtiene la rotación correcta según la dirección del muro
 */
const getDoorRotation = (direction) => {
  switch (direction) {
    case DOOR_DIRECTIONS.NORTH:
      return 0; // Mirando hacia +Z
    case DOOR_DIRECTIONS.SOUTH:
      return Math.PI; // Mirando hacia -Z
    case DOOR_DIRECTIONS.EAST:
      return -Math.PI / 2; // Mirando hacia -X
    case DOOR_DIRECTIONS.WEST:
      return Math.PI / 2; // Mirando hacia +X
    default:
      return 0;
  }
};

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
  const { width, frameThickness, depth } = DOOR_CONFIG;

  // Offset para que el pivote esté en el borde DERECHO del marco
  // Panel se extiende hacia la izquierda desde el pivote
  const innerPanelWidth = width - frameThickness * 2;
  panel.position.x = -innerPanelWidth / 2 - 0.025;
  handle.position.x = -innerPanelWidth * 0.85;
  handle.position.y = 1.0; // Altura de la manija

  // Posicionar el panel completamente DENTRO de la casa (Z negativo = interior)
  // El panel debe estar pasando el marco interior, no visible desde afuera
  // Cálculo: ir al borde interior del muro, pasar el marco, y centrar el panel
  // Colocar el panel hacia la cara interior del muro (centrado en el grosor)
  const panelOffset = depth / 2 - DOOR_CONFIG.doorThickness / 2 - 0.001;
  panel.position.z = panelOffset;
  handle.position.z = panelOffset;

  pivotGroup.add(panel, handle);
  // Pivote en el borde derecho interno (ajustado a medio grosor de marco)
  pivotGroup.position.x = width / 2 - frameThickness / 2;

  doorGroup.add(frame, pivotGroup);
  doorGroup.userData.pivotGroup = pivotGroup;

  // Posicionar y rotar la puerta según la dirección
  // Ajustar la posición para centrar la puerta en el grosor del muro
  const halfDepth = depth / 2;
  let posX = position.x;
  let posZ = position.z;

  switch (direction) {
    case DOOR_DIRECTIONS.NORTH:
      posZ = position.z + halfDepth; // mover hacia el interior
      break;
    case DOOR_DIRECTIONS.SOUTH:
      posZ = position.z - halfDepth; // mover hacia el interior
      break;
    case DOOR_DIRECTIONS.EAST:
      posX = position.x - halfDepth; // mover hacia el interior
      break;
    case DOOR_DIRECTIONS.WEST:
      posX = position.x + halfDepth; // mover hacia el interior
      break;
    default:
      break;
  }

  // Elevar 0.15 unidades para que no colisione con el piso interior elevado
  doorGroup.position.set(posX, 0.15, posZ);
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
  const { pivotGroup, currentAngle, targetAngle, isOpen } = doorGroup.userData;

  if (Math.abs(currentAngle - targetAngle) > 0.01) {
    const diff = targetAngle - currentAngle;
    const step = Math.sign(diff) * DOOR_CONFIG.animationSpeed;

    doorGroup.userData.currentAngle += step;

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
  doorGroup.userData.isOpen = !doorGroup.userData.isOpen;
  doorGroup.userData.targetAngle = doorGroup.userData.isOpen
    ? DOOR_CONFIG.openAngle
    : 0;

  if (instant && doorGroup.userData.pivotGroup) {
    doorGroup.userData.currentAngle = doorGroup.userData.targetAngle;
    doorGroup.userData.pivotGroup.rotation.y = doorGroup.userData.targetAngle;
  }
};

/**
 * Redondea una posición a valores enteros (snap to grid)
 * @param {Object} position - { x, z }
 * @returns {Object} Posición redondeada
 */
export const snapToGrid = (position) => {
  return {
    x: Math.round(position.x),
    z: Math.round(position.z),
  };
};

/**
 * Actualiza la posición de una puerta manteniendo la dirección
 * @param {THREE.Group} doorGroup
 * @param {Object} newPosition - { x, z }
 * @returns {boolean} true si la posición es válida
 */
export const updateDoorPosition = (doorGroup, newPosition) => {
  const direction = doorGroup.userData.direction;

  // Snap a valores enteros
  const snappedPosition = snapToGrid(newPosition);

  if (!isValidDoorPosition({ ...snappedPosition, direction })) {
    return false;
  }

  doorGroup.position.set(snappedPosition.x, 0, snappedPosition.z);
  // Mantener misma elevación usada al crear la puerta (evita desalineado con el piso)
  doorGroup.position.y = 0.15;
  return true;
};
