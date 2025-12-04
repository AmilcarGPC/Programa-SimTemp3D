import { useEffect, useState, useRef } from "react";

export const useAnimationLoop = (composer, onFrame) => {
  const [fps, setFps] = useState(60);
  const callbackRef = useRef(onFrame);

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

      if (callbackRef.current) {
        callbackRef.current(deltaTime);
      }

      composer.render(deltaTime);

      frameCount++;

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
