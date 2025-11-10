import * as THREE from "three";
import { TREE_CONFIG } from "../config/sceneConfig";

/**
 * Crea un árbol decorativo con tronco y follaje
 * @param {number} x - Posición X
 * @param {number} z - Posición Z
 * @returns {THREE.Group} Grupo conteniendo el árbol completo
 */
export const createTree = (x, z) => {
  const treeGroup = new THREE.Group();

  // Tronco
  const trunkGeometry = new THREE.CylinderGeometry(
    TREE_CONFIG.trunk.radiusTop,
    TREE_CONFIG.trunk.radiusBottom,
    TREE_CONFIG.trunk.height,
    TREE_CONFIG.trunk.segments
  );
  const trunkMaterial = new THREE.MeshLambertMaterial({
    color: TREE_CONFIG.trunk.color,
  });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.set(0, TREE_CONFIG.trunk.height / 2, 0);
  trunk.castShadow = true;
  trunk.receiveShadow = true;

  // Follaje
  const foliageGeometry = new THREE.SphereGeometry(
    TREE_CONFIG.foliage.radius,
    TREE_CONFIG.foliage.widthSegments,
    TREE_CONFIG.foliage.heightSegments
  );
  const foliageMaterial = new THREE.MeshLambertMaterial({
    color: TREE_CONFIG.foliage.color,
  });
  const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
  foliage.position.set(0, TREE_CONFIG.foliage.heightOffset, 0);
  foliage.castShadow = true;
  foliage.receiveShadow = false;

  // Agrupar componentes
  treeGroup.add(trunk);
  treeGroup.add(foliage);
  treeGroup.position.set(x, 0, z);

  return treeGroup;
};

/**
 * Crea múltiples árboles en posiciones específicas
 * @param {Array<{x: number, z: number}>} positions - Array de posiciones
 * @returns {Array<THREE.Group>} Array de grupos de árboles
 */
export const createTrees = (positions) => {
  return positions.map(({ x, z }) => createTree(x, z));
};
