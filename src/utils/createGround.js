import * as THREE from "three";
import { GROUND_CONFIG, MATERIALS_CONFIG } from "../config/sceneConfig";

/**
 * Crea una textura procedural con ruido para simular variación en el césped
 */
const createGrassTexture = () => {
  const { textureSize, noiseIntensity } = GROUND_CONFIG;

  const canvas = document.createElement("canvas");
  canvas.width = textureSize;
  canvas.height = textureSize;
  const ctx = canvas.getContext("2d");

  // Color base blanco para aplicar noise
  ctx.fillStyle = "#82B14E";
  ctx.fillRect(0, 0, textureSize, textureSize);

  // Añadir variación con noise
  const imageData = ctx.getImageData(0, 0, textureSize, textureSize);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * noiseIntensity;
    data[i] = Math.max(0, Math.min(255, data[i] + noise)); // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(GROUND_CONFIG.textureRepeat, GROUND_CONFIG.textureRepeat);

  return texture;
};

/**
 * Crea el terreno/suelo de la escena
 * @returns {THREE.Mesh} El mesh del suelo configurado
 */
export const createGround = () => {
  const geometry = new THREE.PlaneGeometry(
    GROUND_CONFIG.size,
    GROUND_CONFIG.size
  );
  const grassTexture = createGrassTexture();

  const material = new THREE.MeshStandardMaterial({
    color: MATERIALS_CONFIG.ground.color,
    map: grassTexture,
    flatShading: MATERIALS_CONFIG.ground.flatShading,
  });

  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  return ground;
};
