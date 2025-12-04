import * as THREE from "three";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import { WINDOW_CONFIG } from "../config/entityConfig";
import { EntityBase } from "./EntityBase";
import {
  WINDOW_DIRECTIONS,
  isOnWall,
  getWindowRotation,
  updateWindowPosition,
} from "../utils/entityUtils";
import { validateCandidate, buildOthers } from "../utils/entityCollision";

const WindowFrame = () => {
  const frameGroup = new THREE.Group();
  const { width, height, depth, frameThickness } = WINDOW_CONFIG;
  const protrusion = 0.02;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0.0,
  });

  const verticalGeom = new THREE.BoxGeometry(
    frameThickness,
    height,
    depth + protrusion
  );
  const horizontalGeom = new THREE.BoxGeometry(
    width,
    frameThickness,
    depth + protrusion
  );

  const leftFrame = new THREE.Mesh(verticalGeom, frameMaterial);
  leftFrame.position.set(-width / 2 + frameThickness / 2, height / 2, 0);
  leftFrame.receiveShadow = true;

  const rightFrame = new THREE.Mesh(verticalGeom, frameMaterial);
  rightFrame.position.set(width / 2 - frameThickness / 2, height / 2, 0);
  rightFrame.receiveShadow = true;

  const topFrame = new THREE.Mesh(horizontalGeom, frameMaterial);
  topFrame.position.set(0, height - frameThickness / 2, 0);
  topFrame.receiveShadow = true;
  const bottomFrame = new THREE.Mesh(horizontalGeom, frameMaterial);
  bottomFrame.position.set(0, frameThickness / 2, 0);
  bottomFrame.receiveShadow = true;

  frameGroup.add(leftFrame, rightFrame, topFrame, bottomFrame);
  return frameGroup;
};

const WindowGrid = () => {
  const {
    width,
    height,
    glassThickness,
    panesColumns,
    panesRows,
    muntinThickness,
  } = WINDOW_CONFIG;

  const gridGroup = new THREE.Group();
  const innerWidth = width * 0.9;
  const innerHeight = height * 0.9;
  const depth = glassThickness + 0.01;

  const gridMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0,
  });

  if (panesColumns && panesColumns > 1) {
    const cellWidth = innerWidth / panesColumns;
    for (let i = 1; i < panesColumns; i++) {
      const x = -innerWidth / 2 + i * cellWidth;
      const geom = new THREE.BoxGeometry(muntinThickness, innerHeight, depth);
      const bar = new THREE.Mesh(geom, gridMat);
      bar.position.set(x, innerHeight / 2, 0);
      bar.receiveShadow = false;
      gridGroup.add(bar);
    }
  }

  if (panesRows && panesRows > 1) {
    const cellHeight = innerHeight / panesRows;
    for (let j = 1; j < panesRows; j++) {
      const y = j * cellHeight;
      const geom = new THREE.BoxGeometry(innerWidth, muntinThickness, depth);
      const bar = new THREE.Mesh(geom, gridMat);
      bar.position.set(0, y, 0);
      bar.receiveShadow = false;
      gridGroup.add(bar);
    }
  }

  return gridGroup;
};

const WindowCutout = () => {
  const { width, height, depth } = WINDOW_CONFIG;
  const geom = new THREE.BoxGeometry(
    width,
    height,
    Math.max(depth + 0.2, depth * 1.1)
  );
  const brush = new Brush(geom);
  brush.position.y = WINDOW_CONFIG.sillHeight + height / 2;
  brush.updateMatrixWorld();
  return brush;
};

class WindowEntity extends EntityBase {
  constructor({ position, direction, id } = {}) {
    super({ type: "window", id, position });
    this.userData.direction = direction;
    this.userData.isActive = false;
    this.userData.targetAngle = 0;
    this.userData.currentAngle = 0;

    const frame = WindowFrame();
    const grid = WindowGrid();

    const { width, height, frameThickness, glassThickness } = WINDOW_CONFIG;

    const shutterGroup = new THREE.Group();
    const innerWidth = width * 0.9;
    const innerHeight = height * 0.9;
    const shutterThickness = Math.max(frameThickness, 0.06);
    const shutterMat = new THREE.MeshStandardMaterial({
      color: 0x444d4d,
      roughness: 0.8,
      metalness: 0,
    });

    const shutterGeom = new THREE.BoxGeometry(
      innerWidth,
      innerHeight + 0.02,
      shutterThickness
    );
    const shutter = new THREE.Mesh(shutterGeom, shutterMat);
    shutter.position.set(0, innerHeight / 2, glassThickness / 2 + 0.01);
    shutter.receiveShadow = false;
    shutter.castShadow = false;
    shutterGroup.add(shutter);

    const shutterClosedY = innerHeight / 2;

    const pointLight = new THREE.PointLight(0xfff3c4, 0, 1.2, 2);
    pointLight.position.set(0, innerHeight / 2, -(glassThickness / 2) - 0.2);
    pointLight.castShadow = false;

    this.add(frame, grid, shutterGroup, pointLight);

    this.userData.shutterGroup = shutterGroup;
    this.userData.pointLight = pointLight;
    this.userData.lightTarget = 0;
    this.userData.lightCurrent = 0;

    const shutterOpenY = shutterClosedY - (height + frameThickness + 0.15);
    this.userData.shutterClosedY = shutterClosedY;
    this.userData.shutterOpenY = shutterOpenY;
    this.userData.shutterTargetY = shutterClosedY;
    this.userData.shutterCurrentY = shutterClosedY;

    if (position) {
      this.position.set(position.x, WINDOW_CONFIG.sillHeight, position.z);
    } else {
      this.position.y = WINDOW_CONFIG.sillHeight;
    }

    const inset = HOUSE_CONFIG.wallThickness / 2;
    if (this.userData.direction === WINDOW_DIRECTIONS.NORTH) {
      this.position.z += inset;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.SOUTH) {
      this.position.z -= inset;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.EAST) {
      this.position.x -= inset;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.WEST) {
      this.position.x += inset;
    }

    this.rotation.y = getWindowRotation(direction);

    this.onToggle = (instant = false) => {
      const isOpen = !!this.userData.isActive;
      const targetY = isOpen
        ? this.userData.shutterOpenY
        : this.userData.shutterClosedY;
      this.userData.shutterTargetY = targetY;
      this.userData.lightTarget = isOpen ? 2.5 : 0.0;
      this.userData.shutterCurrentY = targetY;
      if (this.userData.shutterGroup)
        this.userData.shutterGroup.children.forEach((c) => {
          c.position.y = targetY;
        });
      if (this.userData.pointLight) {
        this.userData.lightCurrent = this.userData.lightTarget;
        this.userData.pointLight.intensity = this.userData.lightTarget;
        this.userData.pointLight.visible =
          this.userData.pointLight.intensity > 0.001;
      }
    };

    this.updateAnimation = () => {
      const shutterGroup = this.userData.shutterGroup;
      if (shutterGroup) {
        const shutterCurrentY = this.userData.shutterCurrentY || 0;
        const shutterTargetY = this.userData.shutterTargetY || 0;
        if (Math.abs(shutterCurrentY - shutterTargetY) > 0.01) {
          const diff = shutterTargetY - shutterCurrentY;
          const step = Math.sign(diff) * (WINDOW_CONFIG.animationSpeed || 0.04);
          this.userData.shutterCurrentY = shutterCurrentY + step;
          if (Math.abs(this.userData.shutterCurrentY - shutterTargetY) < 0.01)
            this.userData.shutterCurrentY = shutterTargetY;
          shutterGroup.children.forEach((c) => {
            c.position.y = this.userData.shutterCurrentY;
          });
        }
      }

      const pointLight = this.userData.pointLight;
      if (pointLight) {
        const lc = this.userData.lightCurrent || 0;
        const lt = this.userData.lightTarget || 0;
        if (Math.abs(lc - lt) > 0.01) {
          const step = (WINDOW_CONFIG.animationSpeed || 0.04) * 1.2;
          const next = lc + Math.sign(lt - lc) * step;
          this.userData.lightCurrent = Math.abs(next) < 0.001 ? 0 : next;
          pointLight.intensity = THREE.MathUtils.clamp(
            this.userData.lightCurrent,
            0,
            3.5
          );
          pointLight.visible = pointLight.intensity > 0.001;
        }
      }
    };
  }

  validatePosition(world = null, basePos = null) {
    const pos = basePos ||
      this.userData.basePosition || { x: this.position.x, z: this.position.z };
    if (
      !isOnWall({
        x: pos.x,
        z: pos.z,
        direction: this.userData.direction,
      })
    ) {
      return false;
    }

    if (!world) return true;

    const candidateFull = {
      type: "window",
      position: { x: pos.x, z: pos.z },
      direction: this.userData.direction,
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
      updateWindowPosition(this, { x: newBase.x, z: newBase.z });
    } catch (e) {}
  }
}

export const Window = ({ position, direction, id } = {}) => {
  if (!isOnWall({ ...position, direction })) {
    console.warn("Invalid window position:", position, direction);
    return null;
  }
  return new WindowEntity({ position, direction, id });
};

export const applyWindowCutouts = (wallsMesh, windowPositions) => {
  if (!windowPositions || windowPositions.length === 0) return wallsMesh;

  const evaluator = new Evaluator();
  let result = wallsMesh;

  windowPositions.forEach((win) => {
    const cutout = WindowCutout();
    const halfDepth = WINDOW_CONFIG.depth / 2;
    let cutX = win.position.x;
    let cutZ = win.position.z;

    switch (win.direction) {
      case WINDOW_DIRECTIONS.NORTH:
        cutZ = win.position.z + halfDepth;
        break;
      case WINDOW_DIRECTIONS.SOUTH:
        cutZ = win.position.z - halfDepth;
        break;
      case WINDOW_DIRECTIONS.EAST:
        cutX = win.position.x - halfDepth;
        break;
      case WINDOW_DIRECTIONS.WEST:
        cutX = win.position.x + halfDepth;
        break;
      default:
        break;
    }
    cutout.position.x = cutX;
    cutout.position.z = cutZ;
    cutout.rotation.y = getWindowRotation(win.direction);
    cutout.updateMatrixWorld();

    const wallBrush = new Brush(result.geometry);
    wallBrush.material = result.material;
    wallBrush.position.copy(result.position);
    wallBrush.rotation.copy(result.rotation);
    wallBrush.scale.copy(result.scale);
    wallBrush.updateMatrixWorld();

    const newResult = evaluator.evaluate(wallBrush, cutout, SUBTRACTION);
    newResult.material = wallsMesh.material;
    newResult.castShadow = wallsMesh.castShadow;
    newResult.receiveShadow = wallsMesh.receiveShadow;

    newResult.geometry.attributes.position.needsUpdate = true;
    if (newResult.geometry.attributes.normal)
      newResult.geometry.attributes.normal.needsUpdate = true;
    if (newResult.geometry.attributes.uv)
      newResult.geometry.attributes.uv.needsUpdate = true;
    newResult.geometry.computeBoundingSphere();
    newResult.geometry.computeBoundingBox();

    result = newResult;
  });
  return result;
};

export const toggleWindow = (windowGroup, instant = false) => {
  if (!windowGroup?.userData) return;
  if (typeof windowGroup.toggle === "function") {
    windowGroup.toggle(instant);
  }
};

export const updateWindowAnimation = (windowGroup) => {
  if (!windowGroup?.userData) return;
  if (typeof windowGroup.updateAnimation === "function") {
    windowGroup.updateAnimation();
  }
};
