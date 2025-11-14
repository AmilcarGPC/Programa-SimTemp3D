import { HOUSE_CONFIG } from "../config/sceneConfig";

/**
 * Direcciones válidas para las puertas (N, S, E, W)
 */
export const DOOR_DIRECTIONS = {
  NORTH: "north",
  SOUTH: "south",
  EAST: "east",
  WEST: "west",
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

  switch (direction) {
    case DOOR_DIRECTIONS.NORTH:
      return (
        Math.abs(z + halfSize) < tolerance &&
        x > -halfSize + 1 &&
        x < halfSize - 1
      );
    case DOOR_DIRECTIONS.SOUTH:
      return (
        Math.abs(z - halfSize) < tolerance &&
        x > -halfSize + 1 &&
        x < halfSize - 1
      );
    case DOOR_DIRECTIONS.EAST:
      return Math.abs(x - halfSize) < tolerance && Math.abs(z) < halfSize - 1;
    case DOOR_DIRECTIONS.WEST:
      return Math.abs(x + halfSize) < tolerance && Math.abs(z) < halfSize - 1;
    default:
      return false;
  }
};

/**
 * Obtiene la rotación correcta según la dirección del muro
 */
export const getDoorRotation = (direction) => {
  switch (direction) {
    case DOOR_DIRECTIONS.NORTH:
      return 0;
    case DOOR_DIRECTIONS.SOUTH:
      return Math.PI;
    case DOOR_DIRECTIONS.EAST:
      return -Math.PI / 2;
    case DOOR_DIRECTIONS.WEST:
      return Math.PI / 2;
    default:
      return 0;
  }
};

/**
 * Redondea una posición a valores enteros (snap to grid)
 * @param {Object} position - { x, z }
 * @returns {Object} Posición redondeada
 */
export const snapToGrid = (position) => ({
  x: Math.round(position.x),
  z: Math.round(position.z),
});

/**
 * Actualiza la posición de una puerta manteniendo la dirección
 * @param {THREE.Group} doorGroup
 * @param {Object} newPosition - { x, z }
 * @returns {boolean} true si la posición es válida
 */
export const updateDoorPosition = (doorGroup, newPosition) => {
  const direction = doorGroup.userData.direction;

  const snappedPosition = snapToGrid(newPosition);

  if (!isValidDoorPosition({ ...snappedPosition, direction })) {
    return false;
  }

  doorGroup.position.set(snappedPosition.x, 0, snappedPosition.z);

  if (direction === DOOR_DIRECTIONS.NORTH) {
    doorGroup.position.z += HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === DOOR_DIRECTIONS.SOUTH) {
    doorGroup.position.z -= HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === DOOR_DIRECTIONS.EAST) {
    doorGroup.position.x -= HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === DOOR_DIRECTIONS.WEST) {
    doorGroup.position.x += HOUSE_CONFIG.wallThickness / 2;
  }

  doorGroup.position.y = 0.15;
  return true;
};
