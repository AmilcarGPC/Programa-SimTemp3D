import { DOOR_CONFIG, WINDOW_CONFIG } from "../config/sceneConfig";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import { AC_CONFIG } from "./createAirConditioner";

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

// Devuelve true si un AC (montado en pared) se solapa con una puerta
export const isACOverlappingDoor = (acData, doorData) => {
  if (!acData || !doorData) return false;
  if (acData.direction !== doorData.direction) return false;

  const isNS = acData.direction === "north" || acData.direction === "south";
  const acCenter = isNS ? acData.position.x : acData.position.z;
  const doorCenter = isNS ? doorData.position.x : doorData.position.z;

  const acHalf = (AC_CONFIG.width || 2.5) / 2;
  const doorHalf = (DOOR_CONFIG.width || 2) / 2;

  // horizontal overlap along wall axis
  const horizOverlap = Math.abs(acCenter - doorCenter) < acHalf + doorHalf;

  // vertical overlap: AC mounted centered around y=2, height = AC_CONFIG.height
  const acBottom = 2 - (AC_CONFIG.height || 0.75) / 2;
  const acTop = acBottom + (AC_CONFIG.height || 0.75);
  const doorBottom = 0.15;
  const doorTop = doorBottom + (DOOR_CONFIG.height || 2.5);

  const vertOverlap = !(acTop <= doorBottom || doorTop <= acBottom);

  return horizOverlap && vertOverlap;
};

// Devuelve true si un AC se solapa con una ventana (misma pared)
export const isACOverlappingWindow = (acData, windowData) => {
  if (!acData || !windowData) return false;
  if (acData.direction !== windowData.direction) return false;

  const isNS = acData.direction === "north" || acData.direction === "south";
  const acCenter = isNS ? acData.position.x : acData.position.z;
  const winCenter = isNS ? windowData.position.x : windowData.position.z;

  const acHalf = (AC_CONFIG.width || 2.5) / 2;
  const winHalf = (WINDOW_CONFIG.width || 1.2) / 2;

  const horizOverlap = Math.abs(acCenter - winCenter) < acHalf + winHalf;

  // vertical: window spans sillHeight..sillHeight+height
  const acBottom = 2 - (AC_CONFIG.height || 0.75) / 2;
  const acTop = acBottom + (AC_CONFIG.height || 0.75);
  const winBottom = WINDOW_CONFIG.sillHeight || 1.0;
  const winTop = winBottom + (WINDOW_CONFIG.height || 1.0);

  const vertOverlap = !(acTop <= winBottom || winTop <= acBottom);

  return horizOverlap && vertOverlap;
};

// Devuelve true si un calefactor en el suelo está delante de un AC montado en pared
export const isHeaterBlockingAC = (heaterPos, acData) => {
  if (!heaterPos || !acData) return false;

  const halfHouse = HOUSE_CONFIG.size / 2;
  const heaterHalf = 0.5; // heater footprint half
  const threshold = 1.0; // distancia perpendicular máxima para considerarlo "en frente"

  const dir = acData.direction;
  const isNS = dir === "north" || dir === "south";

  const acCenter = isNS ? acData.position.x : acData.position.z;
  const heaterCenter = isNS ? heaterPos.x : heaterPos.z;

  const acHalf = (AC_CONFIG.width || 2.5) / 2;
  const horizOverlap = Math.abs(acCenter - heaterCenter) < acHalf + heaterHalf;

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

// Devuelve true si dos AC montados en pared se solapan (misma pared)
export const isACOverlappingAC = (acA, acB) => {
  if (!acA || !acB) return false;
  if (acA.id && acB.id && acA.id === acB.id) return false;
  if (acA.direction !== acB.direction) return false;

  const isNS = acA.direction === "north" || acA.direction === "south";
  const aCenter = isNS ? acA.position.x : acA.position.z;
  const bCenter = isNS ? acB.position.x : acB.position.z;

  const aHalf = (AC_CONFIG.width || 2.5) / 2;
  const bHalf = (AC_CONFIG.width || 2.5) / 2;

  const horizOverlap = Math.abs(aCenter - bCenter) < aHalf + bHalf;

  // Vertical overlap — both mounted at same height (y ~ 2)
  const aBottom = 2 - (AC_CONFIG.height || 0.75) / 2;
  const aTop = aBottom + (AC_CONFIG.height || 0.75);
  const bBottom = 2 - (AC_CONFIG.height || 0.75) / 2;
  const bTop = bBottom + (AC_CONFIG.height || 0.75);

  const vertOverlap = !(aTop <= bBottom || bTop <= aBottom);

  return horizOverlap && vertOverlap;
};
