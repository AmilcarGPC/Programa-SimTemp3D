/**
 * ThermalSimulation.js
 * 
 * Implements 2D heat equation using explicit finite difference method.
 * Solves: ∂T/∂t = α∇²T
 * where α is thermal diffusivity
 */

export class ThermalSimulation {
    /**
     * Compute one time step of the 2D heat equation
     * @param {Array<Array<number>>} temperatures - Temperature grid (width+2 x height+2) with borders
     * @param {Array<Array<number>>} constraints - Constraint mask (1 = fixed, 0 = free)
     * @param {number} deltaTime - Time step in seconds
     * @param {Object} options - Simulation options
     * @returns {Array<Array<number>>} New temperature grid
     */
    static computeStep(temperatures, constraints, deltaTime, options = {}) {
        const {
            alpha = 0.00002,  // Thermal diffusivity of air (m²/s)
            dx = 1.0,         // Grid spacing (meters)
        } = options;

        const width = temperatures.length;
        const height = temperatures[0].length;

        // Check stability condition: r = α * Δt / (Δx²) should be <= 0.25 for 2D
        const r = (alpha * deltaTime) / (dx * dx);

        if (r > 0.25) {
            console.warn(`Stability condition violated: r = ${r.toFixed(4)} > 0.25. Using sub-stepping.`);
            const subSteps = Math.ceil(r / 0.25);
            const subDeltaTime = deltaTime / subSteps;

            let currentTemp = temperatures;
            for (let step = 0; step < subSteps; step++) {
                currentTemp = this.computeStep(currentTemp, constraints, subDeltaTime, { alpha, dx });
            }
            return currentTemp;
        }

        // Create copy for new temperatures
        const newTemp = temperatures.map(row => [...row]);

        // Apply explicit finite difference scheme
        for (let i = 1; i < width - 1; i++) {
            for (let j = 1; j < height - 1; j++) {
                // Skip if cell is constrained (fixed temperature)
                if (constraints[i][j] === 1) {
                    newTemp[i][j] = temperatures[i][j];
                    continue;
                }

                // 5-point stencil for Laplacian
                const T_center = temperatures[i][j];
                const T_right = temperatures[i + 1][j];
                const T_left = temperatures[i - 1][j];
                const T_down = temperatures[i][j + 1];
                const T_up = temperatures[i][j - 1];

                // Explicit forward Euler step
                newTemp[i][j] = T_center + r * (T_right + T_left + T_down + T_up - 4 * T_center);
            }
        }

        return newTemp;
    }

    /**
     * Compute multiple time steps
     * @param {Array<Array<number>>} temperatures - Initial temperature grid
     * @param {Array<Array<number>>} constraints - Constraint mask
     * @param {number} totalTime - Total simulation time (seconds)
     * @param {number} timeStep - Time step size (seconds)
     * @param {Object} options - Simulation options
     * @returns {Array<Array<number>>} Final temperature grid
     */
    static simulate(temperatures, constraints, totalTime, timeStep, options = {}) {
        const numSteps = Math.floor(totalTime / timeStep);
        let currentTemp = temperatures;

        for (let step = 0; step < numSteps; step++) {
            currentTemp = this.computeStep(currentTemp, constraints, timeStep, options);
        }

        return currentTemp;
    }

    /**
     * Calculate recommended time step for stability
     * @param {number} dx - Grid spacing (meters)
     * @param {number} alpha - Thermal diffusivity (m²/s)
     * @param {number} safetyFactor - Safety factor (default 0.8 to stay well below limit)
     * @returns {number} Recommended time step (seconds)
     */
    static getStableTimeStep(dx, alpha = 0.00002, safetyFactor = 0.8) {
        // For 2D explicit scheme: Δt <= 0.25 * (Δx²) / α
        return safetyFactor * 0.25 * (dx * dx) / alpha;
    }
}

/**
 * Common thermal diffusivity values (m²/s at room temperature)
 */
export const ThermalDiffusivity = {
    AIR: 0.00002,       // 2.0e-5 m²/s
    WATER: 0.000143,    // 1.43e-4 m²/s
    CONCRETE: 0.0000005, // 5e-7 m²/s (approx)
    WOOD: 0.00000009,   // 9e-8 m²/s (approx)
    STEEL: 0.000012,    // 1.2e-5 m²/s
};
