/**
 * Configuración centralizada para la escena 3D
 * Facilita el mantenimiento y ajustes globales
 */

export const HOUSE_CONFIG = {
  size: 10,
  wallThickness: 0.5,
  wallHeight: 3,
  floorOffset: 0.01,
};

export const CAMERA_CONFIG = {
  fov: 40,
  near: 0.1,
  far: 100,
  position: { x: 0, y: 20, z: 0 },
};

export const RENDERER_CONFIG = {
  maxPixelRatio: 2,
  shadowMapType: "PCFSoft", // THREE.PCFSoftShadowMap
  toneMapping: "ACESFilmic", // THREE.ACESFilmicToneMapping
  toneMappingExposure: 1.0,
};

export const LIGHTING_CONFIG = {
  hemisphere: {
    skyColor: 0xffffff,
    groundColor: 0x7ab55b,
    intensity: 1,
  },
  sun: {
    color: 0xfff3e0,
    intensity: 1.0,
    position: { x: 15, y: 15, z: 10 },
    shadow: {
      mapSize: 2048,
      near: 1,
      far: 60,
      cameraSize: 25,
      radius: 5,
      bias: -0.0002,
    },
  },
  ambient: {
    color: 0xffffff,
    intensity: 1,
  },
  fill: {
    color: 0xffffff,
    intensity: 1,
    distance: 30,
  },
};

export const GROUND_CONFIG = {
  size: 50,
  color: 0x73a148,
  textureRepeat: 4,
  noiseIntensity: 40,
  textureSize: 512,
};

export const TREE_CONFIG = {
  trunk: {
    radiusTop: 0.3,
    radiusBottom: 0.4,
    height: 2,
    segments: 6,
    color: 0x8b4513,
  },
  foliage: {
    radius: 1.5,
    widthSegments: 8,
    heightSegments: 6,
    color: 0x228b22,
    heightOffset: 3,
  },
};

export const TREE_POSITIONS = [
  { x: -12, z: -12 },
  { x: 12, z: -15 },
  { x: -15, z: 12 },
  { x: 13, z: 14 },
  { x: -8, z: 16 },
  { x: 15, z: -10 },
];

export const MATERIALS_CONFIG = {
  floor: {
    color: 0xc1b298, // beige cálido
    roughness: 0.9,
    metalness: 0.0,
  },
  wall: {
    colorExterior: 0xf1f3f2, // blanco cálido - exterior
    colorInterior: 0xdcd4d0, // tono más cálido/oscuro - interior
    roughness: 0.4,
    metalness: 0.0,
  },
  ground: {
    color: 0xb2d48c,
    flatShading: true,
  },
};

export const SCENE_CONFIG = {
  background: 0x87ceeb,
  fog: {
    color: 0x87ceeb,
    near: 30,
    far: 80,
  },
};

export const N8AO_CONFIG = {
  aoRadius: 0.5, // Radio de oclusión
  distanceFalloff: 1.0, // Falloff de distancia
  intensity: 3.0, // Intensidad del efecto
  color: 0x000000, // Color de las sombras
  aoSamples: 16, // Número de muestras AO
  denoiseSamples: 8, // Muestras de denoise
  denoiseRadius: 12, // Radio de denoise
  halfRes: false, // Resolución completa para mejor calidad
};

export const UI_CONFIG = {
  sidePanel: {
    width: 280,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 20,
  },
  footer: {
    height: 50,
    backgroundColor: "rgba(33, 33, 33, 0.95)",
  },
  temperature: {
    external: { min: -20, max: 40, default: 10 },
    internal: { min: 0, max: 35, default: 20 },
  },
};
