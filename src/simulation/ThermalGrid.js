import * as THREE from "three";
import { HOUSE_CONFIG } from "../config/sceneConfig";
import { DOOR_CONFIG, WINDOW_CONFIG, AC_CONFIG, HEATER_CONFIG } from "../config/entityConfig";

export class Particle {
  constructor(x, z, temp) {
    this.x = x;
    this.z = z;
    this.temp = temp;
    this.color = new THREE.Color();
    this.updateColor();
  }

  updateColor() {
    // Range: -10 (Blue) to 45 (Dark Red)
    const minTemp = -10;
    const maxTemp = 45;

    // Clamp temperature
    const t = Math.max(minTemp, Math.min(maxTemp, this.temp));

    // Normalize 0 to 1
    const alpha = (t - minTemp) / (maxTemp - minTemp);

    // Let's use HSL for a nice thermal gradient
    // Blue (0.66) -> Red (0.0)
    this.color.setHSL(0.66 * (1.0 - alpha), 1.0, 0.5);
  }
}

export class ThermalGrid {
  /**
   * @param {number} minX - Start X coordinate
   * @param {number} maxX - End X coordinate
   * @param {number} minZ - Start Z coordinate
   * @param {number} maxZ - End Z coordinate
   * @param {number} density - Particles per unit (e.g., 2 means 2 particles per meter, step 0.5)
   */
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
    const step = 1 / this.density;

    // Calculate cols/rows for indexing
    this.cols = Math.floor((this.maxX - this.minX) / step) + 1;
    this.rows = Math.floor((this.maxZ - this.minZ) / step) + 1;

    // House bounds for initial temp logic
    const houseHalfSize = HOUSE_CONFIG.size / 2;
    const wallThickness = HOUSE_CONFIG.wallThickness;
    const innerHalf = houseHalfSize + wallThickness;

    for (let z = this.minZ; z <= this.maxZ; z += step) {
      for (let x = this.minX; x <= this.maxX; x += step) {
        let temp = 45; // Default External

        if (x > -innerHalf && x < innerHalf && z > -innerHalf && z < innerHalf) {
          temp = -10; // Internal
        }

        const particle = new Particle(x, z, temp);
        this.particles.push(particle);
      }
    }
  }

  getSimulationPayload(doors, windows, heaters, acs, tempExterna) {
    const step = 1 / this.density;
    const houseHalfSize = HOUSE_CONFIG.size / 2;
    const wallThickness = HOUSE_CONFIG.wallThickness;
    const innerHalf = houseHalfSize + wallThickness; // 5.3

    // 1. Define Internal Grid Bounds (indices)
    const startI = Math.ceil((-innerHalf - this.minX) / step);
    const endI = Math.floor((innerHalf - this.minX) / step);
    const startJ = Math.ceil((-innerHalf - this.minZ) / step);
    const endJ = Math.floor((innerHalf - this.minZ) / step);

    const width = endI - startI + 1;
    const height = endJ - startJ + 1;

    if (width <= 0 || height <= 0) return null;

    // 2. Create Payload Matrix (W+2) x (H+2)
    const payload = Array(width + 2).fill().map(() => Array(height + 2).fill(0));

    // 3. Fill Center with current grid temperatures
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

    // 4. Fill Border with Replica (Neumann)
    payload[0][0] = payload[1][1];
    payload[width + 1][0] = payload[width][1];
    payload[0][height + 1] = payload[1][height];
    payload[width + 1][height + 1] = payload[width][height];

    for (let x = 1; x <= width; x++) {
      payload[x][0] = payload[x][1]; // Top
      payload[x][height + 1] = payload[x][height]; // Bottom
    }

    for (let y = 1; y <= height; y++) {
      payload[0][y] = payload[1][y]; // Left
      payload[width + 1][y] = payload[width][y]; // Right
    }

    // 5. Handle Openings
    const applyOpening = (entity, entityWidth) => {
      if (!entity.isActive) return;

      const pos = entity.position;
      const dir = entity.userData?.direction || entity.direction;

      let isHorizontal = (dir === 'north' || dir === 'south');

      if (isHorizontal) {
        const startX = pos.x - entityWidth / 2;
        const endX = pos.x + entityWidth / 2;
        const minInternalX = this.minX + startI * step;

        const idxStart = Math.floor((startX - minInternalX) / step);
        const idxEnd = Math.ceil((endX - minInternalX) / step);

        const validStart = Math.max(0, idxStart);
        const validEnd = Math.min(width - 1, idxEnd);

        const yIndex = (dir === 'north') ? 0 : height + 1;

        for (let i = validStart; i <= validEnd; i++) {
          payload[i + 1][yIndex] = tempExterna;
        }
      } else {
        const startZ = pos.z - entityWidth / 2;
        const endZ = pos.z + entityWidth / 2;
        const minInternalZ = this.minZ + startJ * step;

        const idxStart = Math.floor((startZ - minInternalZ) / step);
        const idxEnd = Math.ceil((endZ - minInternalZ) / step);

        const validStart = Math.max(0, idxStart);
        const validEnd = Math.min(height - 1, idxEnd);

        const xIndex = (dir === 'west') ? 0 : width + 1;

        for (let j = validStart; j <= validEnd; j++) {
          payload[xIndex][j + 1] = tempExterna;
        }
      }
    };

    if (doors) {
      doors.forEach(d => applyOpening(d, DOOR_CONFIG.width));
    }
    if (windows) {
      windows.forEach(w => applyOpening(w, WINDOW_CONFIG.width));
    }

    // 6. Handle Heaters and ACs
    const HEATER_TEMP = 25;
    const AC_TEMP = 16;

    const applyClimateControl = (entity, temp, entityWidth, entityDepth) => {
      if (!entity.isActive) return;

      const pos = entity.position;
      const dir = entity.userData?.direction || entity.direction;

      const minInternalX = this.minX + startI * step;
      const minInternalZ = this.minZ + startJ * step;

      let widthX, depthZ;
      if (dir === 'north' || dir === 'south') {
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

      const idxStartX = Math.floor((startX - minInternalX) / step);
      const idxEndX = Math.ceil((endX - minInternalX) / step);
      const idxStartZ = Math.floor((startZ - minInternalZ) / step);
      const idxEndZ = Math.ceil((endZ - minInternalZ) / step);

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

    if (heaters) {
      heaters.forEach(h => applyClimateControl(h, HEATER_TEMP, HEATER_CONFIG.width, HEATER_CONFIG.depth));
    }
    if (acs) {
      acs.forEach(ac => applyClimateControl(ac, AC_TEMP, AC_CONFIG.width, AC_CONFIG.depth));
    }

    // 7. Generate Constraint Mask
    const constraints = Array(width + 2).fill().map(() => Array(height + 2).fill(0));

    // 7a. All borders are ALWAYS fixed (1)
    for (let x = 0; x < width + 2; x++) {
      constraints[x][0] = 1;
      constraints[x][height + 1] = 1;
    }
    for (let y = 0; y < height + 2; y++) {
      constraints[0][y] = 1;
      constraints[width + 1][y] = 1;
    }

    // 7b. Active heaters/ACs have fixed temperatures
    const markConstraint = (entity, entityWidth, entityDepth) => {
      if (!entity.isActive) return;

      const pos = entity.position;
      const dir = entity.userData?.direction || entity.direction;

      const minInternalX = this.minX + startI * step;
      const minInternalZ = this.minZ + startJ * step;

      let widthX, depthZ;
      if (dir === 'north' || dir === 'south') {
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

      const idxStartX = Math.floor((startX - minInternalX) / step);
      const idxEndX = Math.ceil((endX - minInternalX) / step);
      const idxStartZ = Math.floor((startZ - minInternalZ) / step);
      const idxEndZ = Math.ceil((endZ - minInternalZ) / step);

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

    if (heaters) {
      heaters.forEach(h => markConstraint(h, HEATER_CONFIG.width, HEATER_CONFIG.depth));
    }
    if (acs) {
      acs.forEach(ac => markConstraint(ac, AC_CONFIG.width, AC_CONFIG.depth));
    }

    // Return both temperature payload and constraint mask
    return {
      temperatures: payload,
      constraints: constraints
    };
  }

  /**
   * Apply temperature data from payload to visual grid particles
   * @param {Object} payloadData - Object with {temperatures: Array, constraints: Array}
   */
  applyPayloadToGrid(payloadData) {
    if (!payloadData || !payloadData.temperatures) return;

    const payload = payloadData.temperatures;

    const step = 1 / this.density;
    const houseHalfSize = HOUSE_CONFIG.size / 2;
    const wallThickness = HOUSE_CONFIG.wallThickness;
    const innerHalf = houseHalfSize + wallThickness;

    const startI = Math.ceil((-innerHalf - this.minX) / step);
    const endI = Math.floor((innerHalf - this.minX) / step);
    const startJ = Math.ceil((-innerHalf - this.minZ) / step);
    const endJ = Math.floor((innerHalf - this.minZ) / step);

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
          const newTemp = payload[payloadX][payloadZ];
          this.particles[particleIndex].temp = newTemp;
          this.particles[particleIndex].updateColor();
        }
      }
    }
  }

  update(deltaTime, tempExterna, tempInterna, doors, windows, heaters, acs) {
    const payloadData = this.getSimulationPayload(doors, windows, heaters, acs, tempExterna);

    if (payloadData) {
      this.applyPayloadToGrid(payloadData);
    } else {
      const houseHalfSize = HOUSE_CONFIG.size / 2;
      const wallThickness = HOUSE_CONFIG.wallThickness;
      const innerHalf = houseHalfSize + wallThickness;

      for (const p of this.particles) {
        if (p.x > -innerHalf && p.x < innerHalf && p.z > -innerHalf && p.z < innerHalf) {
          p.temp = tempInterna;
        } else {
          p.temp = tempExterna;
        }
        p.updateColor();
      }
    }

    // Debug log payload (throttled)
    if (Math.random() < 0.01) {
      console.log("=== THERMAL GRID UPDATE ===");
      if (payloadData) {
        const { temperatures, constraints } = payloadData;
        console.log(`Temperatures: ${temperatures.length}x${temperatures[0].length}`);
        console.log(`Constraints: ${constraints.length}x${constraints[0].length}`);

        let constrainedCount = 0;
        for (let i = 0; i < constraints.length; i++) {
          for (let j = 0; j < constraints[i].length; j++) {
            if (constraints[i][j] === 1) constrainedCount++;
          }
        }
        console.log(`Constrained cells: ${constrainedCount} / ${constraints.length * constraints[0].length}`);
      }
    }
  }
}
