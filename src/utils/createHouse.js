import * as THREE from "three";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { HOUSE_CONFIG, MATERIALS_CONFIG } from "../config/sceneConfig";

export const createWallMaterial = (wallHeight) => {
  const wallMaterial = new THREE.MeshStandardMaterial({
    roughness: MATERIALS_CONFIG.wall.roughness,
    metalness: MATERIALS_CONFIG.wall.metalness,
    side: THREE.DoubleSide,
  });

  wallMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.colorExterior = {
      value: new THREE.Color(MATERIALS_CONFIG.wall.colorExterior),
    };
    shader.uniforms.colorInterior = {
      value: new THREE.Color(MATERIALS_CONFIG.wall.colorInterior),
    };
    shader.uniforms.colorFloor = {
      value: new THREE.Color(MATERIALS_CONFIG.floor.color),
    };

    // Usar la altura de pared para detectar techo/piso y centro
    const ceilingThreshold = Math.max(0.5, wallHeight - 0.9);
    const centerY = wallHeight / 2.0;

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
       float isHorizontal = step(0.9, abs(vWorldNormal.y));
       if (isHorizontal > 0.5) {
         float isCeiling = step(${ceilingThreshold.toFixed(
           3
         )}, vWorldPosition.y);
         diffuseColor.rgb = isCeiling > 0.5 ? colorExterior : colorFloor;
       } else {
         vec3 toCenter = normalize(vec3(0.0, ${centerY.toFixed(
           3
         )}, 0.0) - vWorldPosition);
         float facing = dot(vWorldNormal, toCenter);
         diffuseColor.rgb = facing < 0.0 ? colorExterior : colorInterior;
       }`
    );
  };

  return wallMaterial;
};

export const createFloor = () => {
  return null;
};

export const createWalls = () => {
  const evaluator = new Evaluator();
  const { size, wallThickness, wallHeight } = HOUSE_CONFIG;
  const floorThickness = 0.15;

  // Cubo exterior (empieza desde y=0)
  const outerBoxGeometry = new THREE.BoxGeometry(size, wallHeight, size);
  const outerBrush = new Brush(outerBoxGeometry);
  outerBrush.position.set(0, wallHeight / 2, 0);
  outerBrush.updateMatrixWorld();

  // Cubo interior, no llega hasta el suelo (deja espacio para el piso)
  const innerBoxGeometry = new THREE.BoxGeometry(
    size - wallThickness * 2,
    wallHeight + 0.1, // Ligeramente más alto para evitar artefactos en el techo
    size - wallThickness * 2
  );

  const innerBrush = new Brush(innerBoxGeometry);
  innerBrush.position.set(0, wallHeight / 2 + floorThickness, 0);
  innerBrush.updateMatrixWorld();

  const wallsResult = evaluator.evaluate(outerBrush, innerBrush, SUBTRACTION);

  const wallMaterial = createWallMaterial(wallHeight);
  wallsResult.material = wallMaterial;
  wallsResult.castShadow = false;
  wallsResult.receiveShadow = true;

  return wallsResult;
};

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

export const createHouse = () => {
  return {
    floor: createFloor(),
    walls: createWalls(),
    markers: createWallMarkers(),
  };
};
