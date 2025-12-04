export const HOUSE_CONFIG = {
  size: 10,
  wallThickness: 0.3,
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
  shadowMapType: "PCFSoft",
  toneMapping: "ACESFilmic",
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
    color: 0x5d4149,
  },
  foliage: {
    radius: 1.5,
    widthSegments: 8,
    heightSegments: 6,
    color: 0x59853d,
    heightOffset: 3,
  },
};

// Posiciones de árboles organizadas en clusters en cada esquina.
// Cada entrada puede incluir `scale` opcional para variar tamaño.
export const TREE_POSITIONS = [
  // Top-left corner cluster (closer to house corner at -5,-5)
  { x: -6.3, z: -4, scale: 0.5 },
  { x: -7.2, z: -5, scale: 0.85 },
  { x: -4, z: -6.5, scale: 0.6 },

  // Top-right corner cluster (closer to house corner at +5,-5)
  { x: 6.3, z: -3.7, scale: 0.4 },
  { x: 7, z: -4.8, scale: 0.9 },

  // Bottom-left corner cluster (closer to house corner at -5,+5)
  { x: -6.2, z: 4, scale: 0.6 },
  { x: -7, z: 5.5, scale: 0.95 },

  // Bottom-right corner cluster (closer to house corner at +5,+5) - smaller trees
  { x: 4.5, z: 6.3, scale: 0.5 },
  { x: 6.5, z: 6.5, scale: 0.67 },
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
    width: 320,
    backgroundColor:
      "linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(30, 30, 40, 0.92) 100%)",
    padding: 24,
  },
  footer: {
    height: 60,
    backgroundColor:
      "linear-gradient(180deg, rgba(15, 15, 20, 0.95) 0%, rgba(20, 20, 28, 0.98) 100%)",
  },
  temperature: {
    external: { min: -10, max: 45, default: 45 },
    internal: { min: -10, max: 45, default: -10 },
  },
};
