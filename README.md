# Simulador Térmico 3D (React + Vite + Three.js)

Proyecto de visualización y simulación 3D ligero construido con React + Vite y Three.js. Presenta una escena arquitectónica (casa baja sin techo), efectos térmicos visuales ajustables (temperatura externa/interna), un panel de control y métricas en tiempo real.

Este README describe la estructura actual del proyecto, objetivos de cada módulo y pasos rápidos para ejecutar y desarrollar.

## Resumen rápido

- Propósito: visualización interactiva de una casa en 3D con efectos térmicos para explorar cómo cambian colores/ambiente con la temperatura.
- Stack: `React` + `Vite`, `three` (Three.js) con utilidades `@react-three/fiber` + `@react-three/drei` y `postprocessing` / `n8ao` para efectos.

## Comandos principales

- Instalar dependencias (usar flag recomendado para resolver peer deps):

```powershell
npm install --legacy-peer-deps
```

- Levantar servidor de desarrollo:

```powershell
npm run dev
```

- Construir producción:

```powershell
npm run build
```

## Estructura del proyecto (resumen)

Raíz (principales archivos):

```
/
├─ package.json
├─ vite.config.js
├─ index.html
├─ README.md
└─ src/
	 ├─ main.jsx            # Entrada React
	 ├─ App.jsx             # Componente raíz
	 ├─ assets/             # Recursos estáticos (logos, imágenes)
	 ├─ components/         # Componentes React (UI + contenedor canvas)
	 │  ├─ Canvas3D.jsx
	 │  ├─ ControlPanel.jsx
	 │  ├─ MetricsBar.jsx
	 │  └─ ThermalHouseSimulator.jsx
	 ├─ hooks/              # Hooks personalizados para Three.js y lógica
	 │  ├─ useThreeScene.js
	 │  ├─ useLighting.js
	 │  ├─ usePostProcessing.js
	 │  ├─ useAnimationLoop.js
	 │  ├─ useWindowResize.js
	 │  └─ useThermalEffects.js
	 ├─ utils/              # Helpers y creadores de geometría/recursos
	 │  ├─ createGround.js
	 │  ├─ createHouse.js
	 │  ├─ createTree.js
	 │  └─ disposeUtils.js
	 └─ config/             # Configuración centralizada de la escena
			└─ sceneConfig.js
```

### Diagrama conceptual (árbol)

```
ThermalHouseSimulator
├─ Canvas3D (div para WebGL renderer)
├─ ControlPanel (UI: sliders, botones)
└─ MetricsBar (FPS, contador)

Internals (hooks)
├─ useThreeScene -> crea `scene`, `camera`, `renderer`
├─ useLighting -> agrega luces a `scene`
├─ usePostProcessing -> configura `EffectComposer` y passes
├─ useAnimationLoop -> loop de render y cálculo de FPS
└─ useThermalEffects -> adapta `scene.background` y materiales según temperatura
```

## Objetivos de cada carpeta / archivo clave

- `src/components/`:

  - `ThermalHouseSimulator.jsx`: componente de orquestación; monta la escena 3D, gestiona estado de temperaturas y compone `Canvas3D`, `ControlPanel` y `MetricsBar`.
  - `Canvas3D.jsx`: contenedor DOM donde `useThreeScene` añade el `renderer.domElement`.
  - `ControlPanel.jsx`: controles UI (deslizadores para temperatura, botones de acción).
  - `MetricsBar.jsx`: muestra FPS y otros indicadores.

- `src/hooks/`:

  - `useThreeScene.js`: inicializa `THREE.Scene`, cámara y `WebGLRenderer`. Mantiene instancias y adjunta el canvas al DOM.
  - `useLighting.js`: agrega las luces (hemisférica, direccional, ambient, fill). Importante: limpia correctamente targets y objetos.
  - `usePostProcessing.js`: configura `EffectComposer` con passes (N8AO, SMAA, etc.).
  - `useAnimationLoop.js`: requestAnimationFrame loop y cálculo de FPS.
  - `useWindowResize.js`: actualiza cámara/renderer/composer en resize.
  - `useThermalEffects.js`: aplica ajustes visuales según `tempExterna` y `tempInterna`.

- `src/utils/`:

  - `createGround.js`: crea el `Mesh` del suelo y textura procedural (ahora cacheada para evitar recomputo en caliente).
  - `createHouse.js`: genera paredes (usa CSG) y marcadores; material de pared parametrizado por `HOUSE_CONFIG`.
  - `createTree.js`: fabrica árboles decorativos; ahora reutiliza geometrías/materiales compartidos para eficiencia.
  - `disposeUtils.js`: helper seguro para disponer geometrías, materiales y texturas (uso en cleanups).

- `src/config/sceneConfig.js`: parámetros globales (colores, tamaños, posiciones de árboles, UI_CONFIG). Mantener aquí los valores facilita ajustes globales.

## Notas de diseño y mantenimiento

- Separación de responsabilidades: la mayor parte de la lógica Three.js está aislada en `hooks/` y `utils/`, mientras que los componentes React manejan layout y estado de UI.
- Recursos compartidos: `createTree` y `createGround` usan cache/recursos compartidos para reducir memoria y pausas por GC.
- Limpieza robusta: se añadió `disposeUtils.js` y las limpiezas comprueban nulidad, evitando errores al desmontar.
- Rendimiento: operaciones costosas como CSG o generación de texturas pueden bloquear el hilo principal; si experimentas jank, considera precomputar activos o mover operaciones a un WebWorker.

## Cómo contribuir / probar cambios

1. Instalar dependencias (usar la flag indicada):

```powershell
npm install --legacy-peer-deps
```

2. Levantar servidor dev y abrir http://localhost:5173 (o puerto que muestre Vite):

```powershell
npm run dev
```

3. HMR está activo; al modificar hooks o utilitarios asegúrate de probar mount/unmount (desmontado limpio) para detectar leaks.

## Problemas conocidos y recomendaciones rápidas

- Si ves jank en carga: la generación de la malla mediante CSG (`three-bvh-csg`) puede ser costosa. Recomendación: pre-generar la malla o usar WebWorker.
- Para ajustar visuales térmicos: editar `src/hooks/useThermalEffects.js` y `src/config/sceneConfig.js` (valores de color/thresholds).
- Si cambias `UI_CONFIG.sidePanel.width` o `footer.height`, el layout usa variables CSS y se ajustará automáticamente desde `ThermalHouseSimulator.jsx`.

---

Si quieres, puedo:

- Generar un diagrama mermaid más visual en el README.
- Añadir sección de ejemplos para modificar efectos térmicos.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
