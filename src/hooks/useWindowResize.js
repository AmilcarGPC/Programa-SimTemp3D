import { useEffect } from "react";

/**
 * Hook para manejar el resize de la ventana
 * @param {THREE.Camera} camera - La cámara a actualizar
 * @param {THREE.WebGLRenderer} renderer - El renderer a redimensionar
 * @param {EffectComposer} composer - El composer de post-procesamiento
 * @param {React.RefObject} containerRef - Referencia al contenedor
 */
export const useWindowResize = (camera, renderer, composer, containerRef) => {
  useEffect(() => {
    if (!camera || !renderer || !containerRef.current) return;

    const handleResize = () => {
      if (!containerRef.current) return;

      const aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );

      if (composer) {
        composer.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [camera, renderer, composer, containerRef]);
};
