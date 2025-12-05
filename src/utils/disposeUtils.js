export const disposeObject = (obj) => {
  if (!obj) return;

  try {
    obj.traverse((child) => {
      if (child.geometry) {
        try {
          child.geometry.dispose();
        } catch (e) {}
      }

      if (child.material) {
        const disposeMaterial = (m) => {
          try {
            if (m.map) {
              m.map.dispose();
            }
            if (m.normalMap) {
              m.normalMap.dispose();
            }
            if (m.emissiveMap) {
              m.emissiveMap.dispose();
            }
            if (m.roughnessMap) {
              m.roughnessMap.dispose();
            }
            if (m.metalnessMap) {
              m.metalnessMap.dispose();
            }
            if (m.alphaMap) {
              m.alphaMap.dispose();
            }
            if (m.displacementMap) {
              m.displacementMap.dispose();
            }
            if (m.envMap) {
              m.envMap.dispose();
            }

            if (m.dispose) m.dispose();
          } catch (e) {}
        };

        if (Array.isArray(child.material)) {
          child.material.forEach((m) => disposeMaterial(m));
        } else {
          disposeMaterial(child.material);
        }
      }

      if (child.texture) {
        try {
          child.texture.dispose();
        } catch (e) {}
      }
    });
  } catch (e) {}
};
