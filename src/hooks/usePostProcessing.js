import { useEffect, useState } from "react";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  SMAAEffect,
} from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { N8AO_CONFIG } from "../config/sceneConfig";

/**
 * Hook para configurar post-procesamiento (N8AO, etc.)
 * @param {THREE.WebGLRenderer} renderer - El renderer de Three.js
 * @param {THREE.Scene} scene - La escena
 * @param {THREE.Camera} camera - La cámara
 * @returns {EffectComposer} El composer configurado
 */
export const usePostProcessing = (renderer, scene, camera) => {
  const [composer, setComposer] = useState(null);

  useEffect(() => {
    if (!renderer || !scene || !camera) return;

    // Crear composer
    const newComposer = new EffectComposer(renderer);

    // Render pass - renderiza la escena base
    const renderPass = new RenderPass(scene, camera);
    newComposer.addPass(renderPass);

    // N8AO Post Pass - Ambient Occlusion mejorado
    const n8aoPass = new N8AOPostPass(
      scene,
      camera,
      renderer.domElement.width,
      renderer.domElement.height
    );

    // Configurar N8AO
    n8aoPass.configuration.aoRadius = N8AO_CONFIG.aoRadius;
    n8aoPass.configuration.distanceFalloff = N8AO_CONFIG.distanceFalloff;
    n8aoPass.configuration.intensity = N8AO_CONFIG.intensity;
    n8aoPass.configuration.color.set(N8AO_CONFIG.color);
    n8aoPass.configuration.aoSamples = N8AO_CONFIG.aoSamples;
    n8aoPass.configuration.denoiseSamples = N8AO_CONFIG.denoiseSamples;
    n8aoPass.configuration.denoiseRadius = N8AO_CONFIG.denoiseRadius;
    n8aoPass.configuration.halfRes = N8AO_CONFIG.halfRes;

    newComposer.addPass(n8aoPass);

    // (bloom effect removed to avoid occluding exterior view)

    // SMAA para anti-aliasing (recomendado con AO)
    const smaaEffect = new SMAAEffect();
    const smaaPass = new EffectPass(camera, smaaEffect);
    newComposer.addPass(smaaPass);

    setComposer(newComposer);

    // Cleanup
    return () => {
      newComposer.dispose();
    };
  }, [renderer, scene, camera]);

  return composer;
};
