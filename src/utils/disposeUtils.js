import * as THREE from "three";

/**
 * Recorre un objeto (y sus hijos) y dispone geometrías, materiales y texturas.
 * Protege contra valores nulos y materiales en array.
 */
export const disposeObject = (obj) => {
  if (!obj) return;

  try {
    obj.traverse((child) => {
      if (child.geometry) {
        try {
          child.geometry.dispose();
        } catch (e) {
          // ignore
        }
      }

      if (child.material) {
        const disposeMaterial = (m) => {
          try {
            // Dispose textures attached to the material
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
          } catch (e) {
            // ignore individual material dispose errors
          }
        };

        if (Array.isArray(child.material)) {
          child.material.forEach((m) => disposeMaterial(m));
        } else {
          disposeMaterial(child.material);
        }
      }

      // Dispose textures directly attached
      if (child.texture) {
        try {
          child.texture.dispose();
        } catch (e) {
          // ignore
        }
      }
    });
  } catch (e) {
    // ignore overall traversal errors
  }
};
