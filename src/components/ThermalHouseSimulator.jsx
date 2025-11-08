import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";

const ThermalHouseSimulator = () => {
  const containerRef = useRef(null);
  const [fps, setFps] = useState(60);
  const [tempExterna, setTempExterna] = useState(10);
  const [tempInterna, setTempInterna] = useState(20);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 30, 80);

    // Camera setup - Perspective camera with telephoto lens (83mm equivalent)
    const aspect =
      containerRef.current.clientWidth / containerRef.current.clientHeight;
    // 83mm lens ≈ 16° FOV (for full frame 35mm equivalent)
    const fov = 45;
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    camera.position.set(0, 20, 0); // antes (0, 20, 0)

    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting Setup
    // 1. Hemisphere Light - Simulates Sky/Ground ambient lighting (HDRI replacement)
    const hemisphereLight = new THREE.HemisphereLight(
      0xbfd8ff, // cielo
      0x7ab55b, // pasto
      0.35
    );
    scene.add(hemisphereLight);

    // 2. Sun Light (Key Light) - Directional from upper left
    const sunLight = new THREE.DirectionalLight(0xfff3e0, 1.3);
    sunLight.position.set(8, 28, 6); // más cenital, sombras más cortas
    sunLight.intensity = 1.1;

    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.radius = 5; // sombras más suaves
    sunLight.shadow.bias = -0.0002;

    scene.add(sunLight);

    // 3. Ambient Light - General fill to prevent complete darkness
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    // Ground terrain with noise texture
    const groundGeometry = new THREE.PlaneGeometry(50, 50);

    // Create noise texture for grass variation
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Base color #73a148
    ctx.fillStyle = "#ffffffff";
    ctx.fillRect(0, 0, 512, 512);

    // Add noise
    const imageData = ctx.getImageData(0, 0, 512, 512);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 40; // Random variation
      data[i] = Math.max(0, Math.min(255, data[i] + noise)); // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
    }

    ctx.putImageData(imageData, 0, 0);

    const grassTexture = new THREE.CanvasTexture(canvas);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(4, 4);

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x73a148, // Mantener el color base
      map: grassTexture,
      flatShading: true,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;

    scene.add(ground);

    // Add some trees for context
    const createTree = (x, z) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 2, 6),
        new THREE.MeshLambertMaterial({ color: 0x8b4513 })
      );
      trunk.position.set(x, 1, z);

      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x228b22 })
      );
      foliage.position.set(x, 3, z);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      foliage.castShadow = true;
      foliage.receiveShadow = false;

      scene.add(trunk);
      scene.add(foliage);
    };

    createTree(-12, -12);
    createTree(12, -15);
    createTree(-15, 12);
    createTree(13, 14);
    createTree(-8, 16);
    createTree(15, -10);

    // House floor (10x10m interior)
    // Casa de 10x10m, paredes más gruesas
    const houseSize = 10;
    const wallThickness = 0.5; // antes 0.2 → ahora se ve un marco más ancho
    const wallHeight = 3;

    const fill = new THREE.PointLight(0xffffff, 0.25, 30);
    fill.position.set(0, wallHeight + 1, 0);
    fill.castShadow = false;
    scene.add(fill);

    // Hacemos el piso un poco más pequeño para que se vea el marco blanco
    const floorSize = houseSize - wallThickness * 2;

    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xcbb08a, // beige cálido tipo el de la referencia
      roughness: 0.9,
      metalness: 0.0,
    });

    // Paredes blanco roto, suaves
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f3ee, // blanco cálido
      roughness: 0.8,
      metalness: 0.0,
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // House walls - Cubo con exclusión interior usando CSG
    const evaluator = new Evaluator();

    // Cubo exterior
    const outerBoxGeometry = new THREE.BoxGeometry(
      houseSize,
      wallHeight,
      houseSize
    );
    const outerBrush = new Brush(outerBoxGeometry);
    outerBrush.position.set(0, wallHeight / 2, 0);
    outerBrush.updateMatrixWorld();

    // Cubo interior (más pequeño)
    const innerBoxGeometry = new THREE.BoxGeometry(
      houseSize - wallThickness * 2,
      wallHeight + 0.1, // Ligeramente más alto para evitar artefactos
      houseSize - wallThickness * 2
    );
    const innerBrush = new Brush(innerBoxGeometry);
    innerBrush.position.set(0, wallHeight / 2, 0);
    innerBrush.updateMatrixWorld();

    // Realizar la sustracción: cubo exterior - cubo interior
    const wallsResult = evaluator.evaluate(outerBrush, innerBrush, SUBTRACTION);
    wallsResult.material = wallMaterial;
    wallsResult.castShadow = true;
    wallsResult.receiveShadow = true;
    scene.add(wallsResult);

    // Contact shadows - Sombra sutil en los 4 bordes del suelo (DENTRO de la casa)
    const shadowWidth = 0.6; // Ancho de la sombra en los bordes
    const shadowOpacityEdge = 0.18; // Opacidad más fuerte en el borde pegado al muro
    const shadowOpacityEnd = 0.0; // Totalmente transparente al final
    
    // Crear un plano de sombra DEL TAMAÑO DEL PISO INTERIOR
    const shadowGeometry = new THREE.PlaneGeometry(
      floorSize,
      floorSize
    );
    
    // Crear un canvas para el gradiente de sombra en los bordes
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 512;
    shadowCanvas.height = 512;
    const shadowCtx = shadowCanvas.getContext('2d');
    
    // Fondo transparente
    shadowCtx.clearRect(0, 0, 512, 512);
    
    // Calcular el ancho del gradiente en píxeles del canvas
    const gradientWidth = (shadowWidth / floorSize) * 512;
    
    // Gradiente superior (desde arriba hacia abajo)
    const gradTop = shadowCtx.createLinearGradient(0, 0, 0, gradientWidth);
    gradTop.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacityEdge})`);
    gradTop.addColorStop(1, `rgba(0, 0, 0, ${shadowOpacityEnd})`);
    shadowCtx.fillStyle = gradTop;
    shadowCtx.fillRect(0, 0, 512, gradientWidth);
    
    // Gradiente inferior (desde abajo hacia arriba)
    const gradBottom = shadowCtx.createLinearGradient(0, 512, 0, 512 - gradientWidth);
    gradBottom.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacityEdge})`);
    gradBottom.addColorStop(1, `rgba(0, 0, 0, ${shadowOpacityEnd})`);
    shadowCtx.fillStyle = gradBottom;
    shadowCtx.fillRect(0, 512 - gradientWidth, 512, gradientWidth);
    
    // Gradiente izquierdo (desde izquierda hacia derecha)
    const gradLeft = shadowCtx.createLinearGradient(0, 0, gradientWidth, 0);
    gradLeft.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacityEdge})`);
    gradLeft.addColorStop(1, `rgba(0, 0, 0, ${shadowOpacityEnd})`);
    shadowCtx.fillStyle = gradLeft;
    shadowCtx.fillRect(0, 0, gradientWidth, 512);
    
    // Gradiente derecho (desde derecha hacia izquierda)
    const gradRight = shadowCtx.createLinearGradient(512, 0, 512 - gradientWidth, 0);
    gradRight.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacityEdge})`);
    gradRight.addColorStop(1, `rgba(0, 0, 0, ${shadowOpacityEnd})`);
    shadowCtx.fillStyle = gradRight;
    shadowCtx.fillRect(512 - gradientWidth, 0, gradientWidth, 512);
    
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    shadowTexture.minFilter = THREE.LinearFilter; // Suavizar aún más
    shadowTexture.magFilter = THREE.LinearFilter;
    
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
    });
    
    const contactShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02; // Ligeramente sobre el suelo
    scene.add(contactShadow);

    // Wall markers (invisible helpers for future window/door placement)
    const markerGeometry = new THREE.SphereGeometry(0.3, 8, 6);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
    });

    // Markers at center of each wall
    const markers = [
      new THREE.Mesh(markerGeometry, markerMaterial.clone()),
      new THREE.Mesh(markerGeometry, markerMaterial.clone()),
      new THREE.Mesh(markerGeometry, markerMaterial.clone()),
      new THREE.Mesh(markerGeometry, markerMaterial.clone()),
    ];

    markers[0].position.set(0, 1.5, -houseSize / 2); // Front
    markers[1].position.set(0, 1.5, houseSize / 2); // Back
    markers[2].position.set(-houseSize / 2, 1.5, 0); // Left
    markers[3].position.set(houseSize / 2, 1.5, 0); // Right

    markers.forEach((m) => scene.add(m));

    // Animation loop
    let frameCount = 0;
    let lastTime = performance.now();
    let fpsUpdateTime = lastTime;

    const animate = () => {
      requestAnimationFrame(animate);

      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      renderer.render(scene, camera);

      frameCount++;

      // Update FPS every second
      if (currentTime - fpsUpdateTime > 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - fpsUpdateTime)));
        frameCount = 0;
        fpsUpdateTime = currentTime;
      }
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;

      const aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        style={{
          width: "calc(100vw - 280px)",
          height: "calc(100vh - 50px)",
          position: "absolute",
          left: 0,
          top: 0,
        }}
      />

      {/* Side Panel */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "280px",
          height: "calc(100vh - 50px)",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: "20px",
          boxShadow: "-2px 0 10px rgba(0,0,0,0.1)",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#333" }}>
          Control Térmico
        </h2>

        {/* Temperature Controls */}
        <div style={{ marginBottom: "25px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#555",
              fontSize: "14px",
            }}
          >
            Temperatura Externa: {tempExterna}°C
          </label>
          <input
            type="range"
            min="-20"
            max="40"
            value={tempExterna}
            onChange={(e) => setTempExterna(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "25px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#555",
              fontSize: "14px",
            }}
          >
            Temperatura Interna: {tempInterna}°C
          </label>
          <input
            type="range"
            min="0"
            max="35"
            value={tempInterna}
            onChange={(e) => setTempInterna(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ marginBottom: "15px" }}>
          <button
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              marginBottom: "10px",
            }}
          >
            + Añadir Ventana
          </button>

          <button
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#FF9800",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              marginBottom: "10px",
            }}
          >
            + Añadir Calefactor
          </button>

          <button
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            🔄 Reiniciar
          </button>
        </div>

        {/* Info Panel */}
        <div
          style={{
            marginTop: "30px",
            padding: "15px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            fontSize: "13px",
            color: "#666",
          }}
        >
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>Día 1:</strong> Entorno base
          </p>
          <p style={{ margin: "0" }}>Casa 10×10m sin techo</p>
          <p style={{ margin: "8px 0 0 0" }}>Vista arquitectónica fija</p>
        </div>
      </div>

      {/* Footer Metrics Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "50px",
          backgroundColor: "rgba(33, 33, 33, 0.95)",
          color: "white",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: "30px",
          fontSize: "14px",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.2)",
        }}
      >
        <div>
          <strong>FPS:</strong> {fps}
        </div>
        <div>
          <strong>Objetos:</strong> {/* placeholder */} 12
        </div>
        <div>
          <strong>Estado:</strong>{" "}
          <span style={{ color: "#4CAF50" }}>Estable</span>
        </div>
        <div style={{ marginLeft: "auto", color: "#888" }}>
          Three.js r128 | Low Poly Style
        </div>
      </div>
    </div>
  );
};

export default ThermalHouseSimulator;
