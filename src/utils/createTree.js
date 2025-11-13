import * as THREE from "three";
import { TREE_CONFIG } from "../config/sceneConfig";

// Recursos compartidos para árboles (geometrías y materiales)
let sharedTrunkGeometry = null;
let sharedFoliageGeometry = null;
let sharedTrunkMaterial = null;
let sharedFoliageMaterial = null;

const ensureSharedTreeResources = () => {
  if (sharedTrunkGeometry) return;
  // Slightly slimmer trunk so trunk remains visible under foliage
  const trunkTop = TREE_CONFIG.trunk.radiusTop * 0.85;
  const trunkBottom = TREE_CONFIG.trunk.radiusBottom * 0.85;
  sharedTrunkGeometry = new THREE.CylinderGeometry(
    trunkTop,
    trunkBottom,
    TREE_CONFIG.trunk.height,
    Math.max(6, TREE_CONFIG.trunk.segments)
  );

  sharedTrunkMaterial = new THREE.MeshLambertMaterial({
    color: TREE_CONFIG.trunk.color,
  });

  // Low-poly foliage: use an icosahedron/octagonal look with flat shading
  const foliageRadius = TREE_CONFIG.foliage.radius * 0.75; // less bulky
  const foliageDetail = 0; // low-detail (coarse facets)
  sharedFoliageGeometry = new THREE.IcosahedronGeometry(
    foliageRadius,
    foliageDetail
  );

  sharedFoliageMaterial = new THREE.MeshLambertMaterial({
    color: TREE_CONFIG.foliage.color,
    flatShading: true,
  });
};

/**
 * Crea un árbol decorativo con tronco y follaje
 * @param {number} x - Posición X
 * @param {number} z - Posición Z
 * @returns {THREE.Group} Grupo conteniendo el árbol completo
 */
export const createTree = (x, z, scale = 1) => {
  ensureSharedTreeResources();

  const treeGroup = new THREE.Group();

  // Tronco (reutiliza geometría y material compartidos)
  const trunk = new THREE.Mesh(sharedTrunkGeometry, sharedTrunkMaterial);
  trunk.position.set(0, TREE_CONFIG.trunk.height / 2, 0);
  trunk.castShadow = true;
  trunk.receiveShadow = true;

  // Follaje (reutiliza geometría y material compartidos)
  const foliage = new THREE.Mesh(sharedFoliageGeometry, sharedFoliageMaterial);
  // Raise foliage a bit less so trunk is visible; use a reduced offset matching the smaller foliage
  foliage.position.set(0, TREE_CONFIG.foliage.heightOffset * 0.75, 0);
  foliage.castShadow = true;
  foliage.receiveShadow = false;

  // Agrupar componentes
  treeGroup.add(trunk);
  treeGroup.add(foliage);
  treeGroup.position.set(x, 0, z);

  // Aplicar escala si se pide (varias tallas en la misma fábrica)
  if (scale && scale !== 1) {
    treeGroup.scale.set(scale, scale, scale);
  }

  return treeGroup;
};

/**
 * Crea múltiples árboles en posiciones específicas
 * @param {Array<{x: number, z: number}>} positions - Array de posiciones
 * @returns {Array<THREE.Group>} Array de grupos de árboles
 */
export const createTrees = (positions) => {
  // positions puede ser Array de {x, z} o {x, z, scale}
  return positions.map(({ x, z, scale = 1 }) => createTree(x, z, scale));
};
