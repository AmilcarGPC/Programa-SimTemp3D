export class ThermalSimulation {
  static computeStep(temperatures, constraints, deltaTime, options = {}) {
    const {
      alpha = 0.00002, // Diffusividad térmica del aire (m²/s)
      dx = 1.0, // Espaciado de la malla (metros)
    } = options;

    const width = temperatures.length;
    const height = temperatures[0].length;

    // r = α * Δt / (Δx²) debe ser <= 0.25 para 2D
    const r = (alpha * deltaTime) / (dx * dx);

    if (r > 0.25) {
      console.warn(
        `Condición de estabilidad violada: r = ${r.toFixed(
          4
        )} > 0.25. Usando sub-pasos.`
      );
      const subSteps = Math.ceil(r / 0.25);
      const subDeltaTime = deltaTime / subSteps;

      let currentTemp = temperatures;
      for (let step = 0; step < subSteps; step++) {
        currentTemp = this.computeStep(currentTemp, constraints, subDeltaTime, {
          alpha,
          dx,
        });
      }
      return currentTemp;
    }

    const newTemp = temperatures.map((row) => [...row]);

    // Diferencia finita explícita
    for (let i = 1; i < width - 1; i++) {
      for (let j = 1; j < height - 1; j++) {
        // Si la celda tiene una temperatura fija, no se modifica
        if (constraints[i][j] === 1) {
          newTemp[i][j] = temperatures[i][j];
          continue;
        }

        const T_center = temperatures[i][j];
        const T_right = temperatures[i + 1][j];
        const T_left = temperatures[i - 1][j];
        const T_down = temperatures[i][j + 1];
        const T_up = temperatures[i][j - 1];

        newTemp[i][j] =
          T_center + r * (T_right + T_left + T_down + T_up - 4 * T_center);
      }
    }

    return newTemp;
  }
}

export const ThermalDiffusivity = {
  AIR: 0.00002, // 2.0e-5 m²/s
  WATER: 0.000143, // 1.43e-4 m²/s
  CONCRETE: 0.0000005, // 5e-7 m²/s (approx)
  WOOD: 0.00000009, // 9e-8 m²/s (approx)
  STEEL: 0.000012, // 1.2e-5 m²/s
};
