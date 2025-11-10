import * as THREE from "three";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { HOUSE_CONFIG, MATERIALS_CONFIG } from "../config/sceneConfig";

/**
 * Crea el piso de la casa
 * @returns {null} El piso está integrado en las paredes
 */
export const createFloor = () => {
  return null; // El piso está integrado en createWalls()
};

/**
 * Crea las paredes huecas de la casa usando CSG con piso integrado
 * @returns {THREE.Mesh} El mesh de las paredes con piso
 */
export const createWalls = () => {
  const evaluator = new Evaluator();
  const { size, wallThickness, wallHeight } = HOUSE_CONFIG;
  const floorThickness = 0.15;

  // Cubo exterior - empieza desde y=0
  const outerBoxGeometry = new THREE.BoxGeometry(size, wallHeight, size);
  const outerBrush = new Brush(outerBoxGeometry);
  outerBrush.position.set(0, wallHeight / 2, 0);
  outerBrush.updateMatrixWorld();

  // Cubo interior - NO llega hasta el suelo, deja espacio para el piso
  const innerBoxGeometry = new THREE.BoxGeometry(
    size - wallThickness * 2,
    wallHeight + 0.1, // Ligeramente más alto para evitar artefactos en el techo
    size - wallThickness * 2
  );
  const innerBrush = new Brush(innerBoxGeometry);
  // Elevar el cubo interior para dejar el piso
  innerBrush.position.set(0, wallHeight / 2 + floorThickness, 0);
  innerBrush.updateMatrixWorld();

  // Realizar sustracción: exterior - interior = paredes huecas CON PISO
  const wallsResult = evaluator.evaluate(outerBrush, innerBrush, SUBTRACTION);

  // Material personalizado con shader que detecta orientación de normales
  const wallMaterial = new THREE.MeshStandardMaterial({
    roughness: MATERIALS_CONFIG.wall.roughness,
    metalness: MATERIALS_CONFIG.wall.metalness,
    side: THREE.DoubleSide,
  });

  // Shader personalizado para colorear según orientación y posición (piso vs paredes)
  wallMaterial.onBeforeCompile = (shader) => {
    // Agregar uniforms para los colores
    shader.uniforms.colorExterior = {
      value: new THREE.Color(MATERIALS_CONFIG.wall.colorExterior),
    };
    shader.uniforms.colorInterior = {
      value: new THREE.Color(MATERIALS_CONFIG.wall.colorInterior),
    };
    shader.uniforms.colorFloor = {
      value: new THREE.Color(MATERIALS_CONFIG.floor.color),
    };

    // Agregar varying para pasar la posición del mundo
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
       varying vec3 vWorldPosition;
       varying vec3 vWorldNormal;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <worldpos_vertex>",
      `#include <worldpos_vertex>
       vWorldPosition = worldPosition.xyz;
       vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);`
    );

    // Modificar el fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
       uniform vec3 colorExterior;
       uniform vec3 colorInterior;
       uniform vec3 colorFloor;
       varying vec3 vWorldPosition;
       varying vec3 vWorldNormal;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
       // Detectar superficies horizontales (piso o techo) por su normal
       float isHorizontal = step(0.9, abs(vWorldNormal.y));
       
       if (isHorizontal > 0.5) {
         // Es una superficie horizontal - determinar si es piso o techo por posición Y
         // El piso está cerca de y=0, el techo está cerca de y=3
         float isCeiling = step(2.0, vWorldPosition.y);
         diffuseColor.rgb = isCeiling > 0.5 ? colorExterior : colorFloor;
       } else {
         // Es una pared - calcular si es exterior o interior
         vec3 toCenter = normalize(vec3(0.0, 1.5, 0.0) - vWorldPosition);
         float facing = dot(vWorldNormal, toCenter);
         diffuseColor.rgb = facing < 0.0 ? colorExterior : colorInterior;
       }`
    );
  };

  wallsResult.material = wallMaterial;
  wallsResult.castShadow = false;
  wallsResult.receiveShadow = true;

  return wallsResult;
};

/**
 * Crea marcadores invisibles en el centro de cada pared
 * Útiles para colocar ventanas/puertas en el futuro
 * @returns {Array<THREE.Mesh>} Array de marcadores
 */
export const createWallMarkers = () => {
  const { size, wallHeight } = HOUSE_CONFIG;
  const markerGeometry = new THREE.SphereGeometry(0.3, 8, 6);
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0,
  });

  const markerPositions = [
    { x: 0, y: wallHeight / 2, z: -size / 2, name: "front" },
    { x: 0, y: wallHeight / 2, z: size / 2, name: "back" },
    { x: -size / 2, y: wallHeight / 2, z: 0, name: "left" },
    { x: size / 2, y: wallHeight / 2, z: 0, name: "right" },
  ];

  return markerPositions.map(({ x, y, z, name }) => {
    const marker = new THREE.Mesh(
      markerGeometry.clone(),
      markerMaterial.clone()
    );
    marker.position.set(x, y, z);
    marker.userData.wallName = name;
    return marker;
  });
};

/**
 * Crea la casa completa (piso + paredes + marcadores)
 * @returns {Object} Objeto con todos los componentes de la casa
 */
export const createHouse = () => {
  return {
    floor: createFloor(),
    walls: createWalls(), // Ahora es un Group con 4 paredes separadas
    markers: createWallMarkers(),
  };
};
