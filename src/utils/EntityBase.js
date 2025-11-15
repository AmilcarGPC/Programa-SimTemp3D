import * as THREE from "three";
import { disposeObject } from "./disposeUtils";

/**
 * Clase base para entidades 3D (puertas, ventanas, calefactores, etc.)
 * Extiende THREE.Group y expone una API mínima: toggle, updateAnimation, dispose.
 */
export class EntityBase extends THREE.Group {
  constructor({
    type = "entity",
    id = null,
    position = null,
    direction = null,
  } = {}) {
    super();
    this.userData = this.userData || {};
    this.userData.type = type;
    this.userData.id = id || `${type}_${Date.now()}`;
    this.userData.direction = direction;
    // Genéricos para animación/estado: subclasses pueden usar keys más específicas
    this.userData.isActive = false;
    this.userData.target = 0;
    this.userData.current = 0;

    if (position)
      this.position.set(position.x || 0, position.y || 0, position.z || 0);
  }

  // Alterna el estado básico; subclasses pueden sobreescribir onToggle
  toggle(instant = false) {
    this.userData.isActive = !this.userData.isActive;
    if (instant) {
      this.userData.current = this.userData.target;
      if (typeof this.applyStateInstant === "function")
        this.applyStateInstant();
    }
    if (typeof this.onToggle === "function") this.onToggle(instant);
  }

  // Método que se llama cada frame para actualizar la animación; override en subclass
  updateAnimation() {
    // noop por defecto
  }

  // Por defecto no hay cutout; las entidades que necesitan CSG lo implementan
  getCutoutBrush() {
    return null;
  }

  // Dispose seguro de geometrías/materiales/texturas
  dispose() {
    disposeObject(this);
  }

  toInfo() {
    return {
      id: this.userData.id,
      type: this.userData.type,
      position: { x: this.position.x, z: this.position.z },
      direction: this.userData.direction,
    };
  }
}
