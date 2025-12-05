import * as THREE from "three";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import {
  DOOR_CONFIG,
  WINDOW_CONFIG,
  AC_CONFIG,
  HEATER_CONFIG,
} from "../config/entityConfig";
import { ThermalSimulation } from "./ThermalSimulation";

export class Particle {
  constructor(x, z, temp) {
    this.x = x;
    this.z = z;
    this.temp = temp;
    this.color = new THREE.Color();
    this.updateColor();
  }

  updateColor() {
    const minTemp = -10;
    const maxTemp = 45;
    const t = Math.max(minTemp, Math.min(maxTemp, this.temp));
    const alpha = (t - minTemp) / (maxTemp - minTemp);
    this.color.setHSL(0.66 * (1.0 - alpha), 1.0, 0.5);
  }
}

export class ThermalGrid {
  constructor(minX, maxX, minZ, maxZ, density) {
    this.minX = minX;
    this.maxX = maxX;
    this.minZ = minZ;
    this.maxZ = maxZ;
    this.density = density;
    this.particles = [];
    this.cols = 0;
    this.rows = 0;
    this.initialize();
  }

  initialize() {
    // Usar enteros para evitar errores de punto flotante con densidades como 3
    this.cols = Math.round((this.maxX - this.minX) * this.density) + 1;
    this.rows = Math.round((this.maxZ - this.minZ) * this.density) + 1;

    const houseHalfSize = HOUSE_CONFIG.size / 2;
    const wallThickness = HOUSE_CONFIG.wallThickness;
    const innerHalf = houseHalfSize + wallThickness;

    for (let j = 0; j < this.rows; j++) {
      const z = this.minZ + j / this.density;
      for (let i = 0; i < this.cols; i++) {
        const x = this.minX + i / this.density;

        let temp = 45;
        if (
          x > -innerHalf &&
          x < innerHalf &&
          z > -innerHalf &&
          z < innerHalf
        ) {
          temp = -10;
        }
        this.particles.push(new Particle(x, z, temp));
      }
    }
  }

  getSimulationPayload(doors, windows, heaters, acs, tempExterna) {
    const step = 1 / this.density;
    const houseHalfSize = HOUSE_CONFIG.size / 2;
    const wallThickness = HOUSE_CONFIG.wallThickness;
    const innerHalf = houseHalfSize + wallThickness;

    // Usar multiplicación por densidad en lugar de división por step
    const startI = Math.ceil((-innerHalf - this.minX) * this.density);
    const endI = Math.floor((innerHalf - this.minX) * this.density);
    const startJ = Math.ceil((-innerHalf - this.minZ) * this.density);
    const endJ = Math.floor((innerHalf - this.minZ) * this.density);

    const width = endI - startI + 1;
    const height = endJ - startJ + 1;

    if (width <= 0 || height <= 0) return null;

    const payload = Array(width + 2)
      .fill()
      .map(() => Array(height + 2).fill(0));

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const gridI = startI + x;
        const gridJ = startJ + y;
        const index = gridJ * this.cols + gridI;
        if (index >= 0 && index < this.particles.length) {
          payload[x + 1][y + 1] = this.particles[index].temp;
        }
      }
    }

    payload[0][0] = payload[1][1];
    payload[width + 1][0] = payload[width][1];
    payload[0][height + 1] = payload[1][height];
    payload[width + 1][height + 1] = payload[width][height];

    for (let x = 1; x <= width; x++) {
      payload[x][0] = payload[x][1];
      payload[x][height + 1] = payload[x][height];
    }

    for (let y = 1; y <= height; y++) {
      payload[0][y] = payload[1][y];
      payload[width + 1][y] = payload[width][y];
    }

    const applyOpening = (entity, entityWidth) => {
      if (!entity.isActive) return;
      const pos = entity.position;
      const dir = entity.userData?.direction || entity.direction;
      let isHorizontal = dir === "north" || dir === "south";

      if (isHorizontal) {
        const startX = pos.x - entityWidth / 2;
        const endX = pos.x + entityWidth / 2;
        const minInternalX = this.minX + startI / this.density;
        const idxStart = Math.floor((startX - minInternalX) * this.density);
        const idxEnd = Math.ceil((endX - minInternalX) * this.density);
        const validStart = Math.max(0, idxStart);
        const validEnd = Math.min(width - 1, idxEnd);
        const yIndex = dir === "north" ? 0 : height + 1;
        for (let i = validStart; i <= validEnd; i++) {
          payload[i + 1][yIndex] = tempExterna;
        }
      } else {
        const startZ = pos.z - entityWidth / 2;
        const endZ = pos.z + entityWidth / 2;
        const minInternalZ = this.minZ + startJ / this.density;
        const idxStart = Math.floor((startZ - minInternalZ) * this.density);
        const idxEnd = Math.ceil((endZ - minInternalZ) * this.density);
        const validStart = Math.max(0, idxStart);
        const validEnd = Math.min(height - 1, idxEnd);
        const xIndex = dir === "west" ? 0 : width + 1;
        for (let j = validStart; j <= validEnd; j++) {
          payload[xIndex][j + 1] = tempExterna;
        }
      }
    };

    if (doors) doors.forEach((d) => applyOpening(d, DOOR_CONFIG.width));
    if (windows) windows.forEach((w) => applyOpening(w, WINDOW_CONFIG.width));

    const HEATER_TEMP = 25;
    const AC_TEMP = 16;

    const applyClimateControl = (entity, temp, entityWidth, entityDepth) => {
      if (!entity.isActive) return;
      const pos = entity.position;
      const dir = entity.userData?.direction || entity.direction;
      const minInternalX = this.minX + startI / this.density;
      const minInternalZ = this.minZ + startJ / this.density;

      let widthX, depthZ;
      if (dir === "north" || dir === "south") {
        widthX = entityWidth;
        depthZ = entityDepth;
      } else {
        widthX = entityDepth;
        depthZ = entityWidth;
      }

      const startX = pos.x - widthX / 2;
      const endX = pos.x + widthX / 2;
      const startZ = pos.z - depthZ / 2;
      const endZ = pos.z + depthZ / 2;

      const idxStartX = Math.floor((startX - minInternalX) * this.density);
      const idxEndX = Math.ceil((endX - minInternalX) * this.density);
      const idxStartZ = Math.floor((startZ - minInternalZ) * this.density);
      const idxEndZ = Math.ceil((endZ - minInternalZ) * this.density);

      const validStartX = Math.max(0, idxStartX);
      const validEndX = Math.min(width - 1, idxEndX);
      const validStartZ = Math.max(0, idxStartZ);
      const validEndZ = Math.min(height - 1, idxEndZ);

      for (let i = validStartX; i <= validEndX; i++) {
        for (let j = validStartZ; j <= validEndZ; j++) {
          payload[i + 1][j + 1] = temp;
        }
      }
    };

    if (heaters)
      heaters.forEach((h) =>
        applyClimateControl(
          h,
          HEATER_TEMP,
          HEATER_CONFIG.width,
          HEATER_CONFIG.depth
        )
      );
    if (acs)
      acs.forEach((ac) =>
        applyClimateControl(ac, AC_TEMP, AC_CONFIG.width, AC_CONFIG.depth)
      );

    const constraints = Array(width + 2)
      .fill()
      .map(() => Array(height + 2).fill(0));

    for (let x = 0; x < width + 2; x++) {
      constraints[x][0] = 1;
      constraints[x][height + 1] = 1;
    }
    for (let y = 0; y < height + 2; y++) {
      constraints[0][y] = 1;
      constraints[width + 1][y] = 1;
    }

    const markConstraint = (entity, entityWidth, entityDepth) => {
      if (!entity.isActive) return;
      const pos = entity.position;
      const dir = entity.userData?.direction || entity.direction;
      const minInternalX = this.minX + startI / this.density;
      const minInternalZ = this.minZ + startJ / this.density;

      let widthX, depthZ;
      if (dir === "north" || dir === "south") {
        widthX = entityWidth;
        depthZ = entityDepth;
      } else {
        widthX = entityDepth;
        depthZ = entityWidth;
      }

      const startX = pos.x - widthX / 2;
      const endX = pos.x + widthX / 2;
      const startZ = pos.z - depthZ / 2;
      const endZ = pos.z + depthZ / 2;

      const idxStartX = Math.floor((startX - minInternalX) * this.density);
      const idxEndX = Math.ceil((endX - minInternalX) * this.density);
      const idxStartZ = Math.floor((startZ - minInternalZ) * this.density);
      const idxEndZ = Math.ceil((endZ - minInternalZ) * this.density);

      const validStartX = Math.max(0, idxStartX);
      const validEndX = Math.min(width - 1, idxEndX);
      const validStartZ = Math.max(0, idxStartZ);
      const validEndZ = Math.min(height - 1, idxEndZ);

      for (let i = validStartX; i <= validEndX; i++) {
        for (let j = validStartZ; j <= validEndZ; j++) {
          constraints[i + 1][j + 1] = 1;
        }
      }
    };

    if (heaters)
      heaters.forEach((h) =>
        markConstraint(h, HEATER_CONFIG.width, HEATER_CONFIG.depth)
      );
    if (acs)
      acs.forEach((ac) => markConstraint(ac, AC_CONFIG.width, AC_CONFIG.depth));

    return {
      temperatures: payload,
      constraints: constraints,
    };
  }

  applyPayloadToGrid(payloadData) {
    if (!payloadData || !payloadData.temperatures) return;

    const payload = payloadData.temperatures;
    const step = 1 / this.density;
    const houseHalfSize = HOUSE_CONFIG.size / 2;
    const wallThickness = HOUSE_CONFIG.wallThickness;
    const innerHalf = houseHalfSize + wallThickness;

    const startI = Math.ceil((-innerHalf - this.minX) * this.density);
    const endI = Math.floor((innerHalf - this.minX) * this.density);
    const startJ = Math.ceil((-innerHalf - this.minZ) * this.density);
    const endJ = Math.floor((innerHalf - this.minZ) * this.density);

    const width = endI - startI + 1;
    const height = endJ - startJ + 1;

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        const payloadX = x + 1;
        const payloadZ = z + 1;
        const gridI = startI + x;
        const gridJ = startJ + z;
        const particleIndex = gridJ * this.cols + gridI;

        if (particleIndex >= 0 && particleIndex < this.particles.length) {
          this.particles[particleIndex].temp = payload[payloadX][payloadZ];
          this.particles[particleIndex].updateColor();
        }
      }
    }
  }

  // Reiniciar las partículas de la cuadrícula a las temperaturas externas/internas dadas
  reset(initialExternal, initialInternal) {
    const houseHalfSize = HOUSE_CONFIG.size / 2;
    const wallThickness = HOUSE_CONFIG.wallThickness;
    const innerHalf = houseHalfSize + wallThickness;

    for (const p of this.particles) {
      if (
        p.x > -innerHalf &&
        p.x < innerHalf &&
        p.z > -innerHalf &&
        p.z < innerHalf
      ) {
        p.temp = initialInternal;
      } else {
        p.temp = initialExternal;
      }
      p.updateColor();
    }
  }

  update(
    deltaTime,
    tempExterna,
    tempInterna,
    doors,
    windows,
    heaters,
    acs,
    simulationSpeed = 10
  ) {
    const payloadData = this.getSimulationPayload(
      doors,
      windows,
      heaters,
      acs,
      tempExterna
    );

    if (payloadData) {
      const { temperatures, constraints } = payloadData;
      const step = 1 / this.density;

      const ITERATIONS_PER_FRAME = simulationSpeed;
      const VISUAL_ALPHA = 0.01;

      let currentTemp = temperatures;
      for (let iter = 0; iter < ITERATIONS_PER_FRAME; iter++) {
        currentTemp = ThermalSimulation.computeStep(
          currentTemp,
          constraints,
          deltaTime,
          { alpha: VISUAL_ALPHA, dx: step }
        );
      }

      this.applyPayloadToGrid({
        temperatures: currentTemp,
        constraints: constraints,
      });
    } else {
      const houseHalfSize = HOUSE_CONFIG.size / 2;
      const wallThickness = HOUSE_CONFIG.wallThickness;
      const innerHalf = houseHalfSize + wallThickness;

      for (const p of this.particles) {
        if (
          p.x > -innerHalf &&
          p.x < innerHalf &&
          p.z > -innerHalf &&
          p.z < innerHalf
        ) {
          p.temp = tempInterna;
        } else {
          p.temp = tempExterna;
        }
        p.updateColor();
      }
    }
  }
}
