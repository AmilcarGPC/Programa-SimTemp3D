import { DOOR_CONFIG, WINDOW_CONFIG } from "../config/sceneConfig";

// Devuelve true si hay solapamiento entre una puerta y una ventana
// doorData/windowData: { position: {x,z}, direction }
export const isDoorWindowOverlapping = (doorData, windowData) => {
  if (!doorData || !windowData) return false;

  // Solo consideramos solapamiento si están en el mismo muro (misma dirección)
  if (doorData.direction !== windowData.direction) return false;

  // Eje longitudinal del muro: para NORTH/SOUTH varia X, para EAST/WEST varia Z
  const isNS = doorData.direction === "north" || doorData.direction === "south";
  const doorCenter = isNS ? doorData.position.x : doorData.position.z;
  const winCenter = isNS ? windowData.position.x : windowData.position.z;

  const doorHalf = (DOOR_CONFIG.width || 2) / 2;
  const winHalf = (WINDOW_CONFIG.width || 1.2) / 2;

  const horizOverlap = Math.abs(doorCenter - winCenter) < doorHalf + winHalf;

  // Vertical ranges
  const doorBottom = 0.15; // consistent with createDoor
  const doorTop = doorBottom + (DOOR_CONFIG.height || 2.5);

  const winBottom = WINDOW_CONFIG.sillHeight || 1.0;
  const winTop = winBottom + (WINDOW_CONFIG.height || 1.0);

  const vertOverlap = !(doorTop <= winBottom || winTop <= doorBottom);

  return horizOverlap && vertOverlap;
};
