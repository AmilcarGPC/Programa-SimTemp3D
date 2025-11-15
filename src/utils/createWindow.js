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
  // Position the cutout according to the window sill height so the hole aligns vertically
  brush.position.y = WINDOW_CONFIG.sillHeight + height / 2;
  brush.updateMatrixWorld();
  return brush;
};

export const createWindow = (options) => {
  const { position, direction, id } = options;

  if (!isValidWindowPosition({ ...position, direction })) {
    console.warn("Invalid window position:", position, direction);
    return null;
  }

  const group = new THREE.Group();
  group.userData = {
    type: "window",
    id: id || `window_${Date.now()}`,
    direction,
    isOpen: false,
    targetAngle: 0,
    currentAngle: 0,
  };

  // Obtener constantes de configuración locales (necesarias para la persiana)
  const { width, height, frameThickness, glassThickness } = WINDOW_CONFIG;

  const frame = createWindowFrame();
  const grid = createWindowGrid();

  // En este modelo la hoja (vidrio + rejilla) queda estática en su marco.
  // Implementamos una persiana (shutter) que se desliza verticalmente,
  // sin rotar la hoja ni el marco.

  // Crear la persiana (shutter) como un panel que cubrirá el vidrio
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
  // Posicionar la persiana para que cubra el vidrio cuando está cerrada
  shutter.position.set(0, innerHeight / 2, glassThickness / 2 + 0.01);
  shutter.receiveShadow = false;
  shutter.castShadow = false;
  shutterGroup.add(shutter);

  // Posición Y cuando la persiana está cerrada (alineada cubriendo el vidrio)
  const shutterClosedY = innerHeight / 2;

  // (no emissive plane — removed to avoid occluding exterior)

  // Crear una luz puntual interior que ilumine la habitación cuando la ventana esté abierta
  // Mantener distancia muy limitada y decay alto para que la luz sea intensa pero no alcance el exterior
  const pointLight = new THREE.PointLight(0xfff3c4, 0, 1.2, 2);
  // colocar más hacia el interior (separamos más del plano de la ventana)
  pointLight.position.set(0, innerHeight / 2, -(glassThickness / 2) - 0.2);
  pointLight.castShadow = false;
  // Distancia menor (1.2) y posición desplazada hacia el interior reducen su influencia hacia el exterior

  // NOTE: glass panel removed per request; keep grid (muntins)
  group.add(frame, grid, shutterGroup, pointLight);
  group.userData.shutterGroup = shutterGroup;
  group.userData.pointLight = pointLight;
  group.userData.lightTarget = 0;
  group.userData.lightCurrent = 0;

  const shutterOpenY = shutterClosedY - (height + frameThickness + 0.15); // se baja por debajo del marco
  group.userData.shutterClosedY = shutterClosedY;
  group.userData.shutterOpenY = shutterOpenY;
  group.userData.shutterTargetY = shutterClosedY;
  group.userData.shutterCurrentY = shutterClosedY;

  // Place the window so its bottom (sill) sits at the configured sillHeight
  group.position.set(position.x, WINDOW_CONFIG.sillHeight, position.z);

  if (direction === WINDOW_DIRECTIONS.NORTH) {
    group.position.z += HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === WINDOW_DIRECTIONS.SOUTH) {
    group.position.z -= HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === WINDOW_DIRECTIONS.EAST) {
    group.position.x -= HOUSE_CONFIG.wallThickness / 2;
  } else if (direction === WINDOW_DIRECTIONS.WEST) {
    group.position.x += HOUSE_CONFIG.wallThickness / 2;
  }

  group.rotation.y = getWindowRotation(direction);

  return group;
};

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
  if (!windowGroup || !windowGroup.userData) return;
  const {
    shutterGroup,
    shutterCurrentY = 0,
    shutterTargetY = 0,
  } = windowGroup.userData;
  if (!shutterGroup) return;
  // Interpolar posición Y de la persiana
  if (Math.abs(shutterCurrentY - shutterTargetY) > 0.01) {
    const diff = shutterTargetY - shutterCurrentY;
    const step = Math.sign(diff) * (WINDOW_CONFIG.animationSpeed || 0.04);
    windowGroup.userData.shutterCurrentY =
      (windowGroup.userData.shutterCurrentY || 0) + step;
    if (Math.abs(windowGroup.userData.shutterCurrentY - shutterTargetY) < 0.01)
      windowGroup.userData.shutterCurrentY = shutterTargetY;
    // Aplicar al mesh de la persiana (primer hijo del grupo)
    shutterGroup.children.forEach((c) => {
      c.position.y = windowGroup.userData.shutterCurrentY;
    });
  }
  // (no emissive plane animation — removed to keep exterior view clear)

  // Animar la intensidad de la luz puntual interior si existe
  const pointLight = windowGroup.userData.pointLight;
  if (pointLight) {
    const lc = windowGroup.userData.lightCurrent || 0;
    const lt = windowGroup.userData.lightTarget || 0;
    if (Math.abs(lc - lt) > 0.01) {
      // paso más pequeño para suavidad, multiplicado para mayor sensación de intensidad
      const step = (WINDOW_CONFIG.animationSpeed || 0.04) * 1.2;
      const next = lc + Math.sign(lt - lc) * step;
      windowGroup.userData.lightCurrent = Math.abs(next) < 0.001 ? 0 : next;
      // Permitir mayor intensidad y clamp para evitar valores extremos
      pointLight.intensity = THREE.MathUtils.clamp(
        windowGroup.userData.lightCurrent,
        0,
        3.5
      );
      pointLight.visible = pointLight.intensity > 0.001;
    }
  }
};

export const toggleWindow = (windowGroup, instant = false) => {
  if (!windowGroup || !windowGroup.userData) return;
  windowGroup.userData.isOpen = !windowGroup.userData.isOpen;
  const targetY = windowGroup.userData.isOpen
    ? windowGroup.userData.shutterOpenY
    : windowGroup.userData.shutterClosedY;
  windowGroup.userData.shutterTargetY = targetY;
  // la luz interior usa un target más alto pero con distance/decay limitado para que no afecte el exterior
  windowGroup.userData.lightTarget = windowGroup.userData.isOpen ? 2.5 : 0.0;
  if (instant && windowGroup.userData.shutterGroup) {
    windowGroup.userData.shutterCurrentY = targetY;
    windowGroup.userData.shutterGroup.children.forEach((c) => {
      c.position.y = targetY;
    });
    if (windowGroup.userData.pointLight) {
      windowGroup.userData.lightCurrent = windowGroup.userData.lightTarget;
      windowGroup.userData.pointLight.intensity =
        windowGroup.userData.lightTarget;
      windowGroup.userData.pointLight.visible =
        windowGroup.userData.pointLight.intensity > 0.001;
    }
  }
};
