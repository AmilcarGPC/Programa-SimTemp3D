import * as THREE from "three";
import { disposeObject } from "./disposeUtils";
import { snapToGrid } from "./entityUtils";

/**
 * EntityBase
 * ---------
 * Base class for scene entities (doors, windows, heaters, aircons, ...).
 * All entities have standardized toggle() and updateAnimation() methods.
 */

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

    // Track base position (aligned to wall grid) separate from world position
    this.userData.basePosition = position
      ? { x: position.x, z: position.z }
      : null;
    this._prevBasePosition = null;
    this._validator = null; // external validator function (entity, world) => boolean
  }

  // Alterna el estado; subclasses pueden sobreescribir onToggle
  toggle(instant = false) {
    this.userData.isActive = !this.userData.isActive;
    if (instant) {
      this.userData.current = this.userData.target;
      if (typeof this.applyStateInstant === "function")
        this.applyStateInstant();
    }
    if (typeof this.onToggle === "function") this.onToggle(instant);
  }

  // Método que se llama cada frame para actualizar la animación; subclasses lo implementan
  updateAnimation() {
    // noop por defecto, subclasses lo sobreescriben
  }

  // Movimiento/validación básica
  setValidator(fn) {
    this._validator = fn;
  }

  // Devuelve true por defecto; subclasses lo sobreescriben para validaciones específicas
  validatePosition(world = null, basePos = null) {
    return true;
  }

  // Mueve la entidad a una nueva posición (base grid). Devuelve true si aceptado.
  moveTo(
    newPos,
    { snap = true, validate = true, world = null, instant = false } = {}
  ) {
    const snapped = snap ? snapToGrid(newPos) : { x: newPos.x, z: newPos.z };
    const oldBase = this.userData.basePosition
      ? { ...this.userData.basePosition }
      : { x: this.position.x, z: this.position.z };

    if (validate) {
      if (typeof this._validator === "function") {
        const ok = this._validator(this, { world, basePosition: snapped });
        if (!ok) return false;
      } else {
        const ok = this.validatePosition(world, snapped);
        if (!ok) return false;
      }
    }

    this._prevBasePosition = oldBase;
    this.userData.basePosition = { x: snapped.x, z: snapped.z };
    this.position.set(snapped.x, this.position.y, snapped.z);

    if (typeof this.onMove === "function") {
      this.onMove(oldBase, { x: snapped.x, z: snapped.z }, { instant });
    }

    return true;
  }

  // Revert to previous base position (if any)
  revertPosition() {
    if (!this._prevBasePosition) return false;
    const prev = this._prevBasePosition;
    this.userData.basePosition = { x: prev.x, z: prev.z };
    this.position.set(prev.x, this.position.y, prev.z);
    if (typeof this.onMove === "function")
      this.onMove(null, prev, { revert: true });
    this._prevBasePosition = null;
    return true;
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
    const base = this.userData.basePosition || {
      x: this.position.x,
      z: this.position.z,
    };
    return {
      id: this.userData.id,
      type: this.userData.type,
      position: { x: base.x, z: base.z },
      direction: this.userData.direction,
    };
  }
}
