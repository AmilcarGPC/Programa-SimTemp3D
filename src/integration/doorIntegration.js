/**
 * MÓDULO DE INTEGRACIÓN PARA EL SISTEMA DE PUERTAS
 *
 * Este archivo proporciona una API simplificada para integrar
 * el sistema de puertas en cualquier componente de Three.js/React
 */

import * as THREE from "three";
import {
  createDoor,
  applyDoorCutouts,
  updateDoorAnimation,
  toggleDoor,
  isValidDoorPosition,
  DOOR_DIRECTIONS,
  DOOR_CONFIG,
} from "./createDoor";

/**
 * Clase para gestionar el sistema de puertas de forma más sencilla
 */
export class DoorManager {
  constructor(scene, wallsMesh) {
    this.scene = scene;
    this.wallsMesh = wallsMesh;
    this.doors = [];
    this.animationEnabled = true;
  }

  /**
   * Añade una puerta en la posición especificada
   * @param {Object} position - { x, z }
   * @param {string} direction - "north", "south", "east", "west"
   * @returns {THREE.Group|null} El objeto de la puerta o null si falló
   */
  addDoor(position, direction) {
    // Validar posición
    if (!isValidDoorPosition({ ...position, direction })) {
      console.warn("❌ Posición inválida para la puerta");
      return null;
    }

    // Verificar distancia mínima
    if (!this.checkMinimumDistance(position)) {
      console.warn("❌ Hay una puerta muy cerca");
      return null;
    }

    // Crear la puerta
    const doorId = `door_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const doorData = { position, direction, id: doorId };
    const doorObject = createDoor(doorData);

    if (!doorObject) {
      console.warn("❌ No se pudo crear la puerta");
      return null;
    }

    // Añadir a la escena y al registro
    this.scene.add(doorObject);
    this.doors.push(doorData);

    console.log(
      `✅ Puerta añadida: ${doorId} en (${position.x}, ${position.z})`
    );
    return doorObject;
  }

  /**
   * Elimina una puerta por ID
   * @param {string} doorId
   * @returns {boolean} true si se eliminó, false si no se encontró
   */
  removeDoor(doorId) {
    const doorObject = this.scene.children.find(
      (child) => child.userData.type === "door" && child.userData.id === doorId
    );

    if (doorObject) {
      this.scene.remove(doorObject);
      this.doors = this.doors.filter((door) => door.id !== doorId);
      console.log(`🗑️ Puerta eliminada: ${doorId}`);
      return true;
    }

    console.warn(`❌ Puerta no encontrada: ${doorId}`);
    return false;
  }

  /**
   * Abre o cierra una puerta
   * @param {string} doorId
   * @returns {boolean} true si se encontró la puerta
   */
  toggleDoor(doorId) {
    const doorObject = this.scene.children.find(
      (child) => child.userData.type === "door" && child.userData.id === doorId
    );

    if (doorObject) {
      toggleDoor(doorObject);
      const state = doorObject.userData.isOpen ? "abriendo" : "cerrando";
      console.log(`🚪 Puerta ${doorId} ${state}`);
      return true;
    }

    return false;
  }

  /**
   * Abre todas las puertas
   */
  openAllDoors() {
    this.scene.children
      .filter((child) => child.userData.type === "door")
      .forEach((door) => {
        if (!door.userData.isOpen) {
          toggleDoor(door);
        }
      });
    console.log("🚪 Todas las puertas abiertas");
  }

  /**
   * Cierra todas las puertas
   */
  closeAllDoors() {
    this.scene.children
      .filter((child) => child.userData.type === "door")
      .forEach((door) => {
        if (door.userData.isOpen) {
          toggleDoor(door);
        }
      });
    console.log("🚪 Todas las puertas cerradas");
  }

  /**
   * Elimina todas las puertas
   */
  clearAllDoors() {
    const doorObjects = this.scene.children.filter(
      (child) => child.userData.type === "door"
    );

    doorObjects.forEach((door) => this.scene.remove(door));
    this.doors = [];
    console.log("🗑️ Todas las puertas eliminadas");
  }

  /**
   * Reconstruye las paredes con los cortes de las puertas
   * @returns {THREE.Mesh} Las nuevas paredes con cortes
   */
  rebuildWalls() {
    if (!this.wallsMesh || this.doors.length === 0) {
      console.warn("❌ No hay paredes o puertas para reconstruir");
      return this.wallsMesh;
    }

    // Aplicar cortes CSG
    const newWalls = applyDoorCutouts(this.wallsMesh, this.doors);

    // Reemplazar en la escena
    this.scene.remove(this.wallsMesh);
    this.scene.add(newWalls);
    this.wallsMesh = newWalls;

    console.log(`🔨 Paredes reconstruidas con ${this.doors.length} aberturas`);
    return newWalls;
  }

  /**
   * Actualiza las animaciones de todas las puertas
   * Llamar en el loop de animación
   */
  update() {
    if (!this.animationEnabled) return;

    this.scene.children.forEach((child) => {
      if (child.userData.type === "door") {
        updateDoorAnimation(child);
      }
    });
  }

  /**
   * Verifica la distancia mínima con otras puertas
   * @private
   */
  checkMinimumDistance(position, minDistance = 2.5) {
    return !this.doors.some((door) => {
      const dx = door.position.x - position.x;
      const dz = door.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      return distance < minDistance;
    });
  }

  /**
   * Obtiene información de todas las puertas
   */
  getDoorsInfo() {
    return this.doors.map((door) => {
      const doorObject = this.scene.children.find(
        (child) =>
          child.userData.type === "door" && child.userData.id === door.id
      );

      return {
        ...door,
        isOpen: doorObject ? doorObject.userData.isOpen : false,
        angle: doorObject ? doorObject.userData.currentAngle : 0,
      };
    });
  }

  /**
   * Encuentra la puerta más cercana a una posición
   */
  findNearestDoor(position) {
    let nearest = null;
    let minDistance = Infinity;

    this.doors.forEach((door) => {
      const dx = door.position.x - position.x;
      const dz = door.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = door;
      }
    });

    return { door: nearest, distance: minDistance };
  }

  /**
   * Exporta la configuración de puertas
   */
  exportConfig() {
    return JSON.stringify(this.doors, null, 2);
  }

  /**
   * Importa una configuración de puertas
   */
  importConfig(configJson) {
    try {
      const config = JSON.parse(configJson);
      this.clearAllDoors();

      config.forEach((doorConfig) => {
        this.addDoor(doorConfig.position, doorConfig.direction);
      });

      console.log(`📥 Importadas ${config.length} puertas`);
      return true;
    } catch (error) {
      console.error("❌ Error al importar configuración:", error);
      return false;
    }
  }
}

/**
 * Función helper para crear un DoorManager fácilmente
 */
export const createDoorManager = (scene, wallsMesh) => {
  return new DoorManager(scene, wallsMesh);
};

/**
 * Hook helper para React (uso sin el hook useDoors)
 */
export const useDoorManagerSimple = (scene, wallsMesh) => {
  const [manager] = React.useState(() => new DoorManager(scene, wallsMesh));

  React.useEffect(() => {
    if (!scene) return;

    let animationId;
    const animate = () => {
      manager.update();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [scene, manager]);

  return manager;
};

// Exportar constantes útiles
export { DOOR_DIRECTIONS, DOOR_CONFIG, isValidDoorPosition };
