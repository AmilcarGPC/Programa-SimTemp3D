import { DOOR_CONFIG, WINDOW_CONFIG } from "../config/sceneConfig";
import { HOUSE_CONFIG } from "../config/sceneConfig";

// Devuelve true si un calefactor está bloqueando una puerta (colocado enfrente)
export const isHeaterBlockingDoor = (heaterPos, doorData) => {
  if (!heaterPos || !doorData) return false;

  const halfHouse = HOUSE_CONFIG.size / 2;
  const heaterHalf = 0.5; // heater footprint half
  const threshold = 1.0; // distancia perpendicular máxima para considerarlo "en frente"

  const dir = doorData.direction;
  const isNS = dir === "north" || dir === "south";

  // centers along wall axis
  const doorCenter = isNS ? doorData.position.x : doorData.position.z;
  const heaterCenter = isNS ? heaterPos.x : heaterPos.z;

  const doorHalf = (DOOR_CONFIG.width || 2) / 2;
  const horizOverlap =
    Math.abs(doorCenter - heaterCenter) < doorHalf + heaterHalf;

  // distancia perpendicular desde el heater hasta el plano del muro
  let wallCoord;
  if (dir === "north") wallCoord = -halfHouse;
  else if (dir === "south") wallCoord = halfHouse;
  else if (dir === "east") wallCoord = halfHouse;
  else wallCoord = -halfHouse; // west

  const perpDist = isNS
    ? Math.abs(heaterPos.z - wallCoord)
    : Math.abs(heaterPos.x - wallCoord);

  return horizOverlap && perpDist <= threshold;
};

// Devuelve true si un calefactor está bloqueando una ventana
export const isHeaterBlockingWindow = (heaterPos, windowData) => {
  if (!heaterPos || !windowData) return false;

  const halfHouse = HOUSE_CONFIG.size / 2;
  const heaterHalf = 0.5;
  const threshold = 1.0;

  const dir = windowData.direction;
  const isNS = dir === "north" || dir === "south";

  const winCenter = isNS ? windowData.position.x : windowData.position.z;
  const heaterCenter = isNS ? heaterPos.x : heaterPos.z;

  const winHalf = (WINDOW_CONFIG.width || 1.2) / 2;
  const horizOverlap =
    Math.abs(winCenter - heaterCenter) < winHalf + heaterHalf;

  let wallCoord;
  if (dir === "north") wallCoord = -halfHouse;
  else if (dir === "south") wallCoord = halfHouse;
  else if (dir === "east") wallCoord = halfHouse;
  else wallCoord = -halfHouse; // west

  const perpDist = isNS
    ? Math.abs(heaterPos.z - wallCoord)
    : Math.abs(heaterPos.x - wallCoord);

  return horizOverlap && perpDist <= threshold;
};

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
