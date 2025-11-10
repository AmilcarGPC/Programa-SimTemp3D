import { useEffect, useState } from "react";
import * as THREE from "three";
import {
  SCENE_CONFIG,
  CAMERA_CONFIG,
  RENDERER_CONFIG,
} from "../config/sceneConfig";

/**
 * Hook para inicializar y gestionar la escena Three.js básica
 * @param {React.RefObject} containerRef - Referencia al contenedor DOM
 * @returns {Object} { scene, camera, renderer, composer }
 */
export const useThreeScene = (containerRef) => {
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Detectar cuando el container está listo
  useEffect(() => {
    if (containerRef.current && !isReady) {
      setIsReady(true);
    }
  });

  useEffect(() => {
    if (!isReady || !containerRef.current) {
      return;
    }

    // Crear escena
    const newScene = new THREE.Scene();
    newScene.background = new THREE.Color(SCENE_CONFIG.background);
    newScene.fog = new THREE.Fog(
      SCENE_CONFIG.fog.color,
      SCENE_CONFIG.fog.near,
      SCENE_CONFIG.fog.far
    );
    setScene(newScene);

    // Crear cámara
    const aspect =
      containerRef.current.clientWidth / containerRef.current.clientHeight;
    const newCamera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.fov,
      aspect,
      CAMERA_CONFIG.near,
      CAMERA_CONFIG.far
    );
    newCamera.position.set(
      CAMERA_CONFIG.position.x,
      CAMERA_CONFIG.position.y,
      CAMERA_CONFIG.position.z
    );
    newCamera.lookAt(0, 0, 0);
    setCamera(newCamera);

    // Crear renderer
    const newRenderer = new THREE.WebGLRenderer({ antialias: true });
    newRenderer.setPixelRatio(
      Math.min(window.devicePixelRatio, RENDERER_CONFIG.maxPixelRatio)
    );
    newRenderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    newRenderer.shadowMap.enabled = true;
    newRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    newRenderer.physicallyCorrectLights = true;
    newRenderer.outputEncoding = THREE.sRGBEncoding;
    newRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    newRenderer.toneMappingExposure = RENDERER_CONFIG.toneMappingExposure;
    setRenderer(newRenderer);

    containerRef.current.appendChild(newRenderer.domElement);

    // Cleanup
    return () => {
      if (containerRef.current && newRenderer.domElement) {
        containerRef.current.removeChild(newRenderer.domElement);
      }
      newRenderer.dispose();
    };
  }, [isReady]);

  return { scene, camera, renderer };
};
