import { WINDOW_CONFIG } from "../config/entityConfig";
import { HOUSE_CONFIG } from "../config/sceneConfig";

export const DOOR_DIRECTIONS = {
  NORTH: "north",
  SOUTH: "south",
  EAST: "east",
  WEST: "west",
};

export const WINDOW_DIRECTIONS = DOOR_DIRECTIONS;

export const isOnWall = (position) => {
  const { x, z, direction } = position || {};
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

export const isOnFloor = (position) => {
  const { x, z } = position || {};
  const halfSize = HOUSE_CONFIG.size / 2;
  const allowed = halfSize - 1; // mantener 1 unidad de margen de las paredes
  return Math.abs(x) <= allowed && Math.abs(z) <= allowed;
};

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

export const getWindowRotation = (direction) => getDoorRotation(direction);

export const snapToGrid = (position) => ({
  x: Math.round(position.x),
  z: Math.round(position.z),
});

export const updateDoorPosition = (doorGroup, newPosition) => {
  const direction = doorGroup.userData.direction;

  const snappedPosition = snapToGrid(newPosition);

  if (!isOnWall({ ...snappedPosition, direction })) {
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

export const updateWindowPosition = (windowGroup, newPosition) => {
  const direction = windowGroup.userData.direction;

  const snappedPosition = snapToGrid(newPosition);

  if (!isOnWall({ ...snappedPosition, direction })) {
    return false;
  }

  windowGroup.position.set(
    snappedPosition.x,
    WINDOW_CONFIG.sillHeight,
    snappedPosition.z
  );

  if (direction === DOOR_DIRECTIONS.NORTH) {
    windowGroup.position.z += HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === DOOR_DIRECTIONS.SOUTH) {
    windowGroup.position.z -= HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === DOOR_DIRECTIONS.EAST) {
    windowGroup.position.x -= HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === DOOR_DIRECTIONS.WEST) {
    windowGroup.position.x += HOUSE_CONFIG.wallThickness / 2;
  }

  return true;
};

export default {
  DOOR_DIRECTIONS,
  WINDOW_DIRECTIONS,
  isOnWall,
  getDoorRotation,
  getWindowRotation,
  snapToGrid,
  updateDoorPosition,
  updateWindowPosition,
};
