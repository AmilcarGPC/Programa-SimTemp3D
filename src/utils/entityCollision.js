import { DOOR_CONFIG, WINDOW_CONFIG } from "../config/sceneConfig";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import { AC_CONFIG } from "./createAirConditioner";

// Normaliza la información mínima necesaria para chequear solapamientos
const getMeta = (ent) => {
  if (!ent) return null;

  // ent puede venir en dos formas: objeto de escena (userData + position)
  // o un plain-data con { position, direction, id, type }
  const type = ent.userData?.type || ent.type || ent.type || null;
  const position = ent.position
    ? { x: ent.position.x, z: ent.position.z, y: ent.position.y }
    : ent.position || (ent.userData && ent.userData.basePosition) || null;

  const direction =
    ent.userData?.direction || ent.direction || ent.userData?.direction;

  const meta = {
    type,
    position,
    direction,
    id: ent.userData?.id || ent.id || ent.id,
  };

  // sizes
  if (type === "door") {
    meta.width = DOOR_CONFIG.width || 2;
    meta.height = DOOR_CONFIG.height || 2.5;
    meta.bottom = 0.15;
    meta.top = meta.bottom + meta.height;
    meta.mount = "wall";
  } else if (type === "window") {
    meta.width = WINDOW_CONFIG.width || 1.2;
    meta.height = WINDOW_CONFIG.height || 1.0;
    meta.bottom = WINDOW_CONFIG.sillHeight || 1.0;
    meta.top = meta.bottom + meta.height;
    meta.mount = "wall";
  } else if (type === "aircon" || type === "ac" || type === "aircon") {
    meta.width = AC_CONFIG.width || 2.5;
    meta.height = AC_CONFIG.height || 0.75;
    meta.bottom = 2 - meta.height / 2;
    meta.top = meta.bottom + meta.height;
    meta.mount = "wall";
  } else if (type === "heater") {
    // floor-mounted heater: footprint ~1x1
    meta.width = 1.0;
    meta.depth = 1.0;
    meta.half = 0.5;
    meta.mount = "floor";
  }

  return meta;
};

// Comprueba solapamiento horizontal a lo largo del muro (eje longitudinal)
const wallAxisCenter = (meta) => {
  if (!meta) return 0;
  const isNS = meta.direction === "north" || meta.direction === "south";
  return isNS ? meta.position.x : meta.position.z;
};

// Comprueba solapamiento vertical
const verticalOverlap = (a, b) => {
  if (a.mount !== "wall" || b.mount !== "wall") return true; // floor vs wall handled elsewhere
  return !(a.top <= b.bottom || b.top <= a.bottom);
};

// Overlap para dos entidades montadas en pared (mismo muro)
const overlapsWall = (a, b) => {
  if (a.direction !== b.direction) return false;
  const aCenter = wallAxisCenter(a);
  const bCenter = wallAxisCenter(b);
  const aHalf = (a.width || 1) / 2;
  const bHalf = (b.width || 1) / 2;
  const horiz = Math.abs(aCenter - bCenter) < aHalf + bHalf;
  const vert = verticalOverlap(a, b);
  return horiz && vert;
};

// Overlap para dos entidades en suelo (2D box overlap XZ)
const overlapsFloor = (a, b) => {
  const ax = a.position.x;
  const az = a.position.z;
  const bx = b.position.x;
  const bz = b.position.z;
  const aHalf = a.half || (a.width ? a.width / 2 : 0.5);
  const bHalf = b.half || (b.width ? b.width / 2 : 0.5);
  const overlapX = Math.abs(ax - bx) < aHalf + bHalf;
  const overlapZ = Math.abs(az - bz) < aHalf + bHalf;
  return overlapX && overlapZ;
};

// Comprueba si un objeto de suelo (heater) está "en frente" de una entidad montada en pared
const isInFront = (floorMeta, wallMeta, threshold = 1.0) => {
  const halfHouse = HOUSE_CONFIG.size / 2;
  const isNS = wallMeta.direction === "north" || wallMeta.direction === "south";
  const wallCoord =
    wallMeta.direction === "north"
      ? -halfHouse
      : wallMeta.direction === "south"
      ? halfHouse
      : wallMeta.direction === "east"
      ? halfHouse
      : -halfHouse;
  const perpDist = isNS
    ? Math.abs(floorMeta.position.z - wallCoord)
    : Math.abs(floorMeta.position.x - wallCoord);
  const wallCenter = isNS ? wallMeta.position.x : wallMeta.position.z;
  const floorCenter = isNS ? floorMeta.position.x : floorMeta.position.z;
  const wallHalf = (wallMeta.width || 1) / 2;
  const floorHalf =
    floorMeta.half || (floorMeta.width ? floorMeta.width / 2 : 0.5);
  const horizOverlap =
    Math.abs(wallCenter - floorCenter) < wallHalf + floorHalf;
  return horizOverlap && perpDist <= threshold;
};

export const overlaps = (entA, entB) => {
  const a = getMeta(entA);
  const b = getMeta(entB);
  if (!a || !b) return false;

  // floor-floor
  if (a.mount === "floor" && b.mount === "floor") return overlapsFloor(a, b);

  // wall-wall
  if (a.mount === "wall" && b.mount === "wall") return overlapsWall(a, b);

  // floor-wall or wall-floor: check in-front semantics
  if (a.mount === "floor" && b.mount === "wall") return isInFront(a, b);
  if (a.mount === "wall" && b.mount === "floor") return isInFront(b, a);

  return false;
};

// Validate candidate against an array of other entities. Returns true if no conflicts.
export const validateCandidate = (candidate, others = []) => {
  for (let i = 0; i < others.length; i++) {
    if (overlaps(candidate, others[i])) return false;
  }
  return true;
};

// Build a flat array of other entities from a `world` descriptor (array or object with arrays)
export const buildOthers = (world = {}, selfId = null) => {
  if (!world) return [];
  if (Array.isArray(world))
    return world.filter((o) => !(o.id && o.id === selfId));
  if (typeof world === "object") {
    const doors = world.doors || [];
    const windows = world.windows || [];
    const heaters = world.heaters || [];
    const acs = world.acs || [];
    return [...doors, ...windows, ...heaters, ...acs].filter(
      (o) => !(o.id && o.id === selfId)
    );
  }
  return [];
};

export default {
  getMeta,
  overlaps,
  validateCandidate,
  isInFront,
  buildOthers,
};
