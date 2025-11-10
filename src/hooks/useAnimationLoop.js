import { useEffect, useState } from "react";

/**
 * Hook para calcular y actualizar FPS
 * @param {EffectComposer} composer - El composer para renderizar
 * @returns {number} FPS actual
 */
export const useAnimationLoop = (composer) => {
  const [fps, setFps] = useState(60);

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
  }, [composer]);

  return fps;
};
