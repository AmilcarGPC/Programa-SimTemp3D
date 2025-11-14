import {
  DOOR_DIRECTIONS,
  isValidDoorPosition,
  getDoorRotation as getDoorRotationFromDoorUtils,
  snapToGrid as snapToGridFromDoorUtils,
} from "./doorUtils";
import { WINDOW_CONFIG, HOUSE_CONFIG } from "../config/sceneConfig";

// Reuse door directions and snap behavior for windows
export const WINDOW_DIRECTIONS = DOOR_DIRECTIONS;

export const snapToGrid = (position) => snapToGridFromDoorUtils(position);

export const isValidWindowPosition = (position) => {
  // For now windows use the same validation rules as doors
  return isValidDoorPosition(position);
};

export const getWindowRotation = (direction) =>
  getDoorRotationFromDoorUtils(direction);

export const updateWindowPosition = (windowGroup, newPosition) => {
  const direction = windowGroup.userData.direction;

  const snappedPosition = snapToGrid(newPosition);

  if (!isValidWindowPosition({ ...snappedPosition, direction })) {
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
