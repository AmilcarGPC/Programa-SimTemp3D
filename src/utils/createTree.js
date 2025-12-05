import * as THREE from "three";
import { TREE_CONFIG } from "../config/sceneConfig";

let sharedTrunkGeometry = null;
let sharedFoliageGeometry = null;
let sharedTrunkMaterial = null;
let sharedFoliageMaterial = null;

const ensureSharedTreeResources = () => {
  if (sharedTrunkGeometry) return;
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

  const foliageRadius = TREE_CONFIG.foliage.radius * 0.75;
  const foliageDetail = 0;
  sharedFoliageGeometry = new THREE.IcosahedronGeometry(
    foliageRadius,
    foliageDetail
  );

  sharedFoliageMaterial = new THREE.MeshLambertMaterial({
    color: TREE_CONFIG.foliage.color,
    flatShading: true,
  });
};

export const createTree = (x, z, scale = 1) => {
  ensureSharedTreeResources();

  const treeGroup = new THREE.Group();

  const trunk = new THREE.Mesh(sharedTrunkGeometry, sharedTrunkMaterial);
  trunk.position.set(0, TREE_CONFIG.trunk.height / 2, 0);
  trunk.castShadow = true;
  trunk.receiveShadow = true;

  const foliage = new THREE.Mesh(sharedFoliageGeometry, sharedFoliageMaterial);
  foliage.position.set(0, TREE_CONFIG.foliage.heightOffset * 0.75, 0);
  foliage.castShadow = true;
  foliage.receiveShadow = false;

  treeGroup.add(trunk);
  treeGroup.add(foliage);
  treeGroup.position.set(x, 0, z);

  if (scale && scale !== 1) {
    treeGroup.scale.set(scale, scale, scale);
  }

  return treeGroup;
};

export const createTrees = (positions) => {
  return positions.map(({ x, z, scale = 1 }) => createTree(x, z, scale));
};
