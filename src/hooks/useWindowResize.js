import { useEffect } from "react";

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
