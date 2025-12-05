import { HOUSE_CONFIG } from "./sceneConfig";

export const AC_CONFIG = {
  // dimensiones (ancho x alto x profundidad) en metros
  width: 2.5,
  height: 0.75,
  depth: 0.75,
  // LED/indicador
  ledRadius: 0.06,
  ledHeightOffset: 0.06,
  ledLightDistance: 3.0,
  // velocidad de animación para pulso LED
  animationSpeed: 1,
  // valor calculable en runtime si se necesita inset según grosor del muro
  getInset: () => HOUSE_CONFIG.wallThickness + AC_CONFIG.depth / 2,
};

export const HEATER_CONFIG = {
  width: 1.0,
  depth: 1.0,
  height: 1.5,
  // LED indicador superior
  ledRadius: 0.06,
  ledLightDistance: 2.0,
  // parámetros de rotación/alineado
  faceCenterStep: Math.PI / 2,
};

// Configuración de puerta (movido desde sceneConfig)
export const DOOR_CONFIG = {
  width: 1.5,
  height: 2.5,
  depth: HOUSE_CONFIG.wallThickness,
  frameThickness: 0.1,
  doorThickness: 0.08,
  handleSize: 0.15,
  openAngle: Math.PI / 2,
  animationSpeed: 1,
};

// Configuración de ventana (movido desde sceneConfig)
export const WINDOW_CONFIG = {
  width: 2,
  height: 1.75,
  depth: HOUSE_CONFIG.wallThickness,
  frameThickness: 0.1,
  glassThickness: 0.02,
  sillDepth: 0.05,
  sillHeight: 0.75,
  openAngle: Math.PI / 3,
  animationSpeed: 1,
  panesColumns: 2,
  panesRows: 2,
  muntinThickness: 0.04,
};

export const ENTITY_DEFAULTS = {
  snapGrid: 0.5,
  minSeparation: 0.5,
};

export default {
  AC_CONFIG,
  HEATER_CONFIG,
  DOOR_CONFIG,
  WINDOW_CONFIG,
  ENTITY_DEFAULTS,
};
