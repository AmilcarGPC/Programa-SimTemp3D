import * as THREE from "three";
import { disposeObject } from "../utils/disposeUtils";
import { snapToGrid } from "../utils/entityUtils";

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
    this.userData.isActive = false;
    this.userData.target = 0;
    this.userData.current = 0;

    if (position)
      this.position.set(position.x || 0, position.y || 0, position.z || 0);

    this.userData.basePosition = position
      ? { x: position.x, z: position.z }
      : null;
    this._prevBasePosition = null;
    this._validator = null;
  }

  toggle(instant = false) {
    this.userData.isActive = !this.userData.isActive;
    if (instant) {
      this.userData.current = this.userData.target;
      if (typeof this.applyStateInstant === "function")
        this.applyStateInstant();
    }
    if (typeof this.onToggle === "function") this.onToggle(instant);
  }

  updateAnimation() {}

  setValidator(fn) {
    this._validator = fn;
  }

  validatePosition(world = null, basePos = null) {
    return true;
  }

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

  getCutoutBrush() {
    return null;
  }

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
      isActive: this.userData.isActive,
    };
  }
}
