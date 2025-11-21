import { useState, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ThermalGrid } from "../simulation/ThermalGrid";

export const useThermalSimulation = (tempExterna, tempInterna) => {
    const [grid, setGrid] = useState(null);
    const gridRef = useRef(null);

    // Initialize grid once
    useEffect(() => {
        // 20x20 area, 0.5 resolution = 40x40 = 1600 points
        const newGrid = new ThermalGrid(20, 20, 0.5);
        gridRef.current = newGrid;
        setGrid(newGrid);
    }, []);

    // Update simulation loop
    useFrame((state, delta) => {
        if (gridRef.current) {
            gridRef.current.update(delta, tempExterna, tempInterna);
        }
    });

    return grid;
};
