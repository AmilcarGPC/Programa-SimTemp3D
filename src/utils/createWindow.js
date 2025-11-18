import * as THREE from "three";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { HOUSE_CONFIG, WINDOW_CONFIG } from "../config/sceneConfig";
import {
  WINDOW_DIRECTIONS,
  isValidWindowPosition,
  getWindowRotation,
  snapToGrid,
  updateWindowPosition,
} from "./windowUtils";
import { EntityBase } from "./EntityBase";

/**
 * Crea el marco de la ventana
 */
const createWindowFrame = () => {
  const { width, height, depth, frameThickness } = WINDOW_CONFIG;

  const frameGroup = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0.0,
  });

  const vertical = new THREE.BoxGeometry(frameThickness, height, depth + 0.02);
  const horizontal = new THREE.BoxGeometry(width, frameThickness, depth + 0.02);

  const left = new THREE.Mesh(vertical, frameMat);
  left.position.set(-width / 2 + frameThickness / 2, height / 2, 0);
  left.receiveShadow = true;

  const right = new THREE.Mesh(vertical, frameMat);
  right.position.set(width / 2 - frameThickness / 2, height / 2, 0);
  right.receiveShadow = true;

  const top = new THREE.Mesh(horizontal, frameMat);
  top.position.set(0, height - frameThickness / 2, 0);
  top.receiveShadow = true;
  const bottom = new THREE.Mesh(horizontal, frameMat);
  bottom.position.set(0, frameThickness / 2, 0);
  bottom.receiveShadow = true;

  frameGroup.add(left, right, top, bottom);
  return frameGroup;
};

/**
 * Crea la rejilla (muntins) para dividir el vidrio en panesColumns x panesRows
 */
const createWindowGrid = () => {
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

  // Vertical bars
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

  // Horizontal bars
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

/**
 * Crea el cristal/hoja de la ventana
 */
const createWindowGlass = () => {
  const { width, height, glassThickness } = WINDOW_CONFIG;

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 0.9,
    transparent: true,
    opacity: 0.9,
  });
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.9, height * 0.9, glassThickness),
    glassMat
  );
  glass.position.y = (height * 0.9) / 2;
  glass.receiveShadow = false;
  return glass;
};

const createWindowCutout = () => {
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

/**
 * Clase WindowEntity que encapsula una ventana con persiana y luz interior.
 */
class WindowEntity extends EntityBase {
  constructor({ position, direction, id } = {}) {
    super({ type: "window", id: id, position: position });
    this.userData.direction = direction;
    // canonical state flag
    this.userData.isActive = false;
    this.userData.targetAngle = 0;
    this.userData.currentAngle = 0;

    const { width, height, frameThickness, glassThickness } = WINDOW_CONFIG;
    const frame = createWindowFrame();
    const grid = createWindowGrid();

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

    if (this.userData.direction === WINDOW_DIRECTIONS.NORTH) {
      this.position.z += HOUSE_CONFIG.wallThickness / 2;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.SOUTH) {
      this.position.z -= HOUSE_CONFIG.wallThickness / 2;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.EAST) {
      this.position.x -= HOUSE_CONFIG.wallThickness / 2;
    } else if (this.userData.direction === WINDOW_DIRECTIONS.WEST) {
      this.position.x += HOUSE_CONFIG.wallThickness / 2;
    }

    this.rotation.y = getWindowRotation(this.userData.direction);

    this.onToggle = (instant = false) => {
      const isOpen = !!this.userData.isActive;
      const targetY = isOpen
        ? this.userData.shutterOpenY
        : this.userData.shutterClosedY;
      this.userData.shutterTargetY = targetY;
      this.userData.lightTarget = isOpen ? 2.5 : 0.0;
      if (instant && this.userData.shutterGroup) {
        this.userData.shutterCurrentY = targetY;
        this.userData.shutterGroup.children.forEach((c) => {
          c.position.y = targetY;
        });
        if (this.userData.pointLight) {
          this.userData.lightCurrent = this.userData.lightTarget;
          this.userData.pointLight.intensity = this.userData.lightTarget;
          this.userData.pointLight.visible =
            this.userData.pointLight.intensity > 0.001;
        }
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

  // Validación local de posición (grid). Devuelve true si la posición es válida.
  validatePosition(world = null, basePos = null) {
    const pos = basePos ||
      this.userData.basePosition || { x: this.position.x, z: this.position.z };
    return isValidWindowPosition({
      x: pos.x,
      z: pos.z,
      direction: this.userData.direction,
    });
  }

  // Ajustes al mover: delegar al helper para aplicar offsets (sillHeight, wallThickness)
  onMove(oldBase, newBase, opts = {}) {
    try {
      updateWindowPosition(this, { x: newBase.x, z: newBase.z });
    } catch (e) {
      // ignore
    }
  }
}

export const createWindow = ({ position, direction, id } = {}) => {
  if (!isValidWindowPosition({ ...position, direction })) {
    console.warn("Invalid window position:", position, direction);
    return null;
  }
  return new WindowEntity({ position, direction, id });
};

// WindowEntity and factory created earlier; createWindow factory returns WindowEntity instance

export const applyWindowCutouts = (wallsMesh, windowPositions) => {
  if (!windowPositions || windowPositions.length === 0) return wallsMesh;
  const evaluator = new Evaluator();
  let result = wallsMesh;
  windowPositions.forEach((win) => {
    const cutout = createWindowCutout();
    const halfDepth = WINDOW_CONFIG.depth / 2;
    let cx = win.position.x;
    let cz = win.position.z;
    switch (win.direction) {
      case WINDOW_DIRECTIONS.NORTH:
        cz = win.position.z + halfDepth;
        break;
      case WINDOW_DIRECTIONS.SOUTH:
        cz = win.position.z - halfDepth;
        break;
      case WINDOW_DIRECTIONS.EAST:
        cx = win.position.x - halfDepth;
        break;
      case WINDOW_DIRECTIONS.WEST:
        cx = win.position.x + halfDepth;
        break;
      default:
        break;
    }
    cutout.position.x = cx;
    cutout.position.z = cz;
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

export const updateWindowAnimation = (windowGroup) => {
  if (!windowGroup?.userData) return;
  if (typeof windowGroup.updateAnimation === "function") {
    windowGroup.updateAnimation();
  }
};

export const toggleWindow = (windowGroup, instant = false) => {
  if (!windowGroup?.userData) return;
  if (typeof windowGroup.toggle === "function") {
    windowGroup.toggle(instant);
  }
};
