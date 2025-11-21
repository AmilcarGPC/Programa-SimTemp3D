import { useEffect, useState, useRef } from "react";

/**
 * Hook para calcular y actualizar FPS
 * @param {EffectComposer} composer - El composer para renderizar
 * @param {Function} onFrame - Callback para cada frame
 * @returns {number} FPS actual
 */
export const useAnimationLoop = (composer, onFrame) => {
  const [fps, setFps] = useState(60);
  const callbackRef = useRef(onFrame);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!composer) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let fpsUpdateTime = lastTime;
    let animationId;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Custom update logic using ref
      if (callbackRef.current) {
        callbackRef.current(deltaTime);
      }

      composer.render(deltaTime);

      frameCount++;

      // Actualizar FPS cada segundo
      if (currentTime - fpsUpdateTime > 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - fpsUpdateTime)));
        frameCount = 0;
        fpsUpdateTime = currentTime;
      }
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [composer]); // Removed onFrame from dependencies to avoid restarts

  return fps;
};
