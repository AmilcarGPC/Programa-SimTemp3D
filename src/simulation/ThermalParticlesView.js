import * as THREE from "three";

export class ThermalParticlesView {
  constructor(grid) {
    this.grid = grid;
    this.mesh = null;
    this.dummy = new THREE.Object3D();
    this.init();
  }

  init() {
    const particles = this.grid.particles;
    const count = particles.length;

    // Calcular tamaño basado en densidad para evitar solapamiento
    // El tamaño del paso es 1 / densidad
    // Queremos que el diámetro sea ligeramente menor que el paso
    // Factor de radio original 0.4. Reducido en 30% -> 0.28
    const step = 1 / this.grid.density;
    const radius = step * 0.28;

    const geometry = new THREE.SphereGeometry(radius, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      this.dummy.position.set(p.x, 0.5, p.z); // y=0.5
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.update();
  }

  update() {
    if (!this.mesh || !this.grid) return;

    const particles = this.grid.particles;
    const count = particles.length;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      this.mesh.setColorAt(i, p.color);
    }

    this.mesh.instanceColor.needsUpdate = true;
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}
