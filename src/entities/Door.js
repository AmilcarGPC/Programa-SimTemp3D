import * as THREE from "three";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import { DOOR_CONFIG } from "../config/entityConfig";
import { EntityBase } from "./EntityBase";
import {
  DOOR_DIRECTIONS,
  isOnWall,
  getDoorRotation,
  updateDoorPosition,
} from "../utils/entityUtils";
import { validateCandidate, buildOthers } from "../utils/entityCollision";

const DoorFrame = () => {
  const frameGroup = new THREE.Group();
  const { width, height, depth, frameThickness } = DOOR_CONFIG;
  const protrusion = 0.02;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.7,
    metalness: 0.1,
  });

  const verticalGeom = new THREE.BoxGeometry(
    frameThickness,
    height,
    depth + protrusion * 2
  );
  const horizontalGeom = new THREE.BoxGeometry(
    width,
    frameThickness,
    depth + protrusion * 2
  );

  const leftFrame = new THREE.Mesh(verticalGeom, frameMaterial);
  leftFrame.position.set(-width / 2 + frameThickness / 2, height / 2, 0);
  leftFrame.castShadow = false;
  leftFrame.receiveShadow = true;

  const rightFrame = new THREE.Mesh(verticalGeom, frameMaterial);
  rightFrame.position.set(width / 2 - frameThickness / 2, height / 2, 0);
  rightFrame.castShadow = false;
  rightFrame.receiveShadow = true;

  const topFrame = new THREE.Mesh(horizontalGeom, frameMaterial);
  topFrame.position.set(0, height - frameThickness / 2, 0);
  topFrame.castShadow = false;
  topFrame.receiveShadow = true;

  frameGroup.add(leftFrame, rightFrame, topFrame);
  return frameGroup;
};

const DoorPanel = () => {
  const { width, height, doorThickness, frameThickness } = DOOR_CONFIG;

  const panelWidth = width - frameThickness * 2 + 0.25;
  const panelHeight = height - frameThickness;

  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0xa0826d,
    roughness: 0.6,
    metalness: 0.0,
  });

  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(panelWidth, panelHeight, doorThickness),
    doorMaterial
  );
  doorPanel.position.y = panelHeight / 2 + frameThickness / 2;
  doorPanel.castShadow = false;
  doorPanel.receiveShadow = true;

  return doorPanel;
};

const DoorHandle = () => {
  const { handleSize, doorThickness } = DOOR_CONFIG;

  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.3,
    metalness: 0.8,
  });

  const handleGroup = new THREE.Group();

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(
      handleSize / 3,
      handleSize / 3,
      handleSize * 2,
      8
    ),
    handleMaterial
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.z = doorThickness / 2 + handleSize / 2;
  handle.castShadow = false;

  handleGroup.add(handle);
  return handleGroup;
};

const DoorCutout = () => {
  const { width, height, depth } = DOOR_CONFIG;

  const cutoutGeometry = new THREE.BoxGeometry(
    width,
    height,
    Math.max(depth + 0.2, depth * 1.1)
  );
  const cutoutBrush = new Brush(cutoutGeometry);

  cutoutBrush.position.y = 0.15 + height / 2;
  cutoutBrush.updateMatrixWorld();

  return cutoutBrush;
};

class DoorEntity extends EntityBase {
  constructor({ position, direction, id } = {}) {
    super({ type: "door", id, position });
    this.userData.direction = direction;
    this.userData.isActive = false;
    this.userData.targetAngle = 0;
    this.userData.currentAngle = 0;

    const frame = DoorFrame();
    const panel = DoorPanel();
    const handle = DoorHandle();

    const pivotGroup = new THREE.Group();
    const { width, frameThickness } = DOOR_CONFIG;

    const panelWidth = width - frameThickness * 2;
    try {
      if (panel.geometry) panel.geometry.dispose();
    } catch (e) {}
    panel.geometry = new THREE.BoxGeometry(
      panelWidth,
      panel.geometry.parameters.height,
      panel.geometry.parameters.depth
    );

    panel.position.x = -panelWidth / 2;
    handle.position.x = -panelWidth * 0.85;
    handle.position.y = 1.0;

    pivotGroup.add(panel, handle);
    pivotGroup.position.x = width / 2 - frameThickness;

    this.add(frame, pivotGroup);
    this.userData.pivotGroup = pivotGroup;

    this.position.set(position.x, 0.15, position.z);

    const inset = HOUSE_CONFIG.wallThickness / 2;
    if (direction === DOOR_DIRECTIONS.NORTH) {
      this.position.z += inset;
    } else if (direction === DOOR_DIRECTIONS.SOUTH) {
      this.position.z -= inset;
    } else if (direction === DOOR_DIRECTIONS.EAST) {
      this.position.x -= inset;
    } else if (direction === DOOR_DIRECTIONS.WEST) {
      this.position.x += inset;
    }

    this.rotation.y = getDoorRotation(direction);

    this.onToggle = (instant = false) => {
      const isOpen = !!this.userData.isActive;
      const target = isOpen ? DOOR_CONFIG.openAngle : 0;
      this.userData.targetAngle = target;
      this.userData.currentAngle = target;
      if (this.userData.pivotGroup)
        this.userData.pivotGroup.rotation.y = target;
    };

    this.updateAnimation = () => {
      const pivot = this.userData.pivotGroup;
      if (!pivot) return;
      const currentAngle = this.userData.currentAngle || 0;
      const targetAngle = this.userData.targetAngle || 0;
      if (Math.abs(currentAngle - targetAngle) > 0.01) {
        const diff = targetAngle - currentAngle;
        const step = Math.sign(diff) * (DOOR_CONFIG.animationSpeed || 0.05);
        this.userData.currentAngle = currentAngle + step;
        if (Math.abs(this.userData.currentAngle - targetAngle) < 0.01) {
          this.userData.currentAngle = targetAngle;
        }
        pivot.rotation.y = this.userData.currentAngle;
      }
    };
  }

  getCutoutBrush() {
    const { width, height, depth } = DOOR_CONFIG;
    const cutoutGeometry = new THREE.BoxGeometry(
      width,
      height,
      Math.max(depth + 0.2, depth * 1.1)
    );
    const cut = new Brush(cutoutGeometry);
    cut.position.y = 0.15 + height / 2;
    cut.updateMatrixWorld();
    return cut;
  }

  validatePosition(world = null, basePos = null) {
    const pos = basePos ||
      this.userData.basePosition || { x: this.position.x, z: this.position.z };

    const candidate = {
      x: pos.x,
      z: pos.z,
      direction: this.userData.direction,
    };
    if (!isOnWall(candidate)) return false;

    if (!world) return true;

    const candidateFull = {
      type: "door",
      position: { x: candidate.x, z: candidate.z },
      direction: candidate.direction,
      id: this.userData.id,
    };

    try {
      const others = buildOthers(world, this.userData.id);
      return validateCandidate(candidateFull, others);
    } catch (e) {
      return false;
    }
  }

  onMove(oldBase, newBase, opts = {}) {
    try {
      updateDoorPosition(this, { x: newBase.x, z: newBase.z });
    } catch (e) {}
  }
}

export const Door = ({ position, direction, id }) => {
  if (!isOnWall({ ...position, direction })) {
    console.warn("Invalid Door position:", position, direction);
    return null;
  }
  return new DoorEntity({ position, direction, id });
};

export const applyDoorCutouts = (wallsMesh, doorPositions) => {
  if (!doorPositions || doorPositions.length === 0) return wallsMesh;

  const evaluator = new Evaluator();
  let resultMesh = wallsMesh;

  doorPositions.forEach((doorPos, index) => {
    const cutout = DoorCutout();
    const halfDepth = DOOR_CONFIG.depth / 2;
    let cutX = doorPos.position.x;
    let cutZ = doorPos.position.z;

    switch (doorPos.direction) {
      case DOOR_DIRECTIONS.NORTH:
        cutZ = doorPos.position.z + halfDepth;
        break;
      case DOOR_DIRECTIONS.SOUTH:
        cutZ = doorPos.position.z - halfDepth;
        break;
      case DOOR_DIRECTIONS.EAST:
        cutX = doorPos.position.x - halfDepth;
        break;
      case DOOR_DIRECTIONS.WEST:
        cutX = doorPos.position.x + halfDepth;
        break;
      default:
        break;
    }

    cutout.position.x = cutX;
    cutout.position.z = cutZ;
    cutout.rotation.y = getDoorRotation(doorPos.direction);
    cutout.updateMatrixWorld();

    const wallBrush = new Brush(resultMesh.geometry);
    wallBrush.material = resultMesh.material;
    wallBrush.position.copy(resultMesh.position);
    wallBrush.rotation.copy(resultMesh.rotation);
    wallBrush.scale.copy(resultMesh.scale);
    wallBrush.updateMatrixWorld();

    const newResult = evaluator.evaluate(wallBrush, cutout, SUBTRACTION);
    newResult.material = wallsMesh.material;
    newResult.castShadow = wallsMesh.castShadow;
    newResult.receiveShadow = wallsMesh.receiveShadow;

    newResult.geometry.attributes.position.needsUpdate = true;
    if (newResult.geometry.attributes.normal) {
      newResult.geometry.attributes.normal.needsUpdate = true;
    }
    if (newResult.geometry.attributes.uv) {
      newResult.geometry.attributes.uv.needsUpdate = true;
    }
    newResult.geometry.computeBoundingSphere();
    newResult.geometry.computeBoundingBox();

    resultMesh = newResult;
  });

  return resultMesh;
};

export const toggleDoor = (doorGroup, instant = false) => {
  if (!doorGroup?.userData) return;
  if (typeof doorGroup.toggle === "function") {
    doorGroup.toggle(instant);
  }
};

export const updateDoorAnimation = (doorGroup) => {
  if (!doorGroup?.userData) return;
  if (typeof doorGroup.updateAnimation === "function") {
    doorGroup.updateAnimation();
  }
};
