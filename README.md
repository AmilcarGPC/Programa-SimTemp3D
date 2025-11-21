# Simulador Térmico 3D (React + Vite + Three.js)

Proyecto de visualización y simulación 3D ligero construido con React + Vite y Three.js. Presenta una escena arquitectónica (casa baja sin techo), efectos térmicos visuales ajustables (temperatura externa/interna), un panel de control y métricas en tiempo real.

Este README describe la estructura actual del proyecto, objetivos de cada módulo y pasos rápidos para ejecutar y desarrollar.

## Resumen rápido

- **Propósito**: visualización interactiva de una casa en 3D con efectos térmicos para explorar cómo cambian colores/ambiente con la temperatura.
- **Stack**: `React` + `Vite`, `three` (Three.js) con utilidades `@react-three/fiber` + `@react-three/drei` y `postprocessing` / `n8ao` para efectos.

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
	 ├─ assets/             # Recursos estáticos
	 ├─ components/         # Componentes React (UI + contenedor canvas)
	 │  ├─ Canvas3D.jsx
	 │  ├─ ControlPanel.jsx
	 │  ├─ MetricsBar.jsx
	 │  ├─ ContextMenu.jsx      # 🖱️ Menú contextual (clic derecho)
	 │  ├─ DoorControl.jsx      # 🚪 Control de puertas
	 │  ├─ WindowControl.jsx    # 🪟 Control de ventanas
	 │  └─ ThermalHouseSimulator.jsx # Orquestador principal
	 ├─ entities/           # 📦 Definición de Entidades (Lógica + Geometría)
	 │  ├─ EntityBase.js        # Clase base para entidades
	 │  ├─ Door.js              # 🚪 Puerta
	 │  ├─ Window.js            # 🪟 Ventana
	 │  ├─ Heater.js            # 🔥 Calefactor
	 │  └─ AirConditioner.js    # ❄️ Aire Acondicionado
	 ├─ hooks/              # Hooks personalizados
	 │  ├─ useThreeScene.js
	 │  ├─ useLighting.js
	 │  ├─ usePostProcessing.js
	 │  ├─ useAnimationLoop.js
	 │  ├─ useWindowResize.js
	 │  ├─ useThermalEffects.js
	 │  └─ useEntities.js       # 🧩 Hook genérico de gestión de entidades
	 ├─ utils/              # Helpers y creadores de geometría/recursos
	 │  ├─ createGround.js
	 │  ├─ createHouse.js
	 │  ├─ createTree.js
	 │  ├─ entityCollision.js   # Lógica de colisiones y validación
	 │  └─ disposeUtils.js
	 └─ config/             # Configuración centralizada
			└─ sceneConfig.js
```

### Diagrama conceptual (árbol)

```
ThermalHouseSimulator
├─ Canvas3D (div para WebGL renderer)
├─ ControlPanel (UI: sliders, botones)
├─ MetricsBar (FPS, contador)
└─ ContextMenu (Menú flotante para añadir/editar)

Internals (hooks)
├─ useThreeScene -> crea `scene`, `camera`, `renderer`
├─ useEntities -> gestiona estado (CRUD) de Puertas, Ventanas, etc.
├─ useLighting -> agrega luces a `scene`
├─ usePostProcessing -> configura `EffectComposer` y passes
└─ useThermalEffects -> adapta `scene.background` y materiales según temperatura
```

## Objetivos de cada carpeta / archivo clave

- `src/components/`:
  - `ThermalHouseSimulator.jsx`: componente de orquestación; monta la escena 3D, gestiona estado de temperaturas, el sistema de entidades (`useEntities`) y la interacción del mouse (raycasting).
  - `ContextMenu.jsx`: menú emergente al hacer clic derecho en muros o suelo para añadir componentes.
  - `ControlPanel.jsx`: controles UI laterales.

- `src/entities/`:
  - Contiene la lógica específica de cada objeto interactivo (geometría, validación de posición, animaciones).
  - `Door.js` / `Window.js`: incluyen lógica CSG para cortar paredes.

- `src/hooks/`:
  - `useEntities.js`: Hook centralizado que maneja la lista de objetos, su adición/eliminación y movimiento. Reemplaza a los antiguos hooks específicos.
  - `useThreeScene.js`: inicializa `THREE.Scene`, cámara y `WebGLRenderer`.

- `src/utils/`:
  - `createHouse.js`: genera paredes y aplica los cortes CSG dinámicamente.
  - `entityCollision.js`: validaciones para evitar superposición de objetos.

## 🧩 Sistema de Entidades Interactivas

El proyecto cuenta con un sistema flexible para colocar objetos en la casa:

- **Tipos soportados**:
  - 🚪 **Puertas**: Cortan el muro, se pueden abrir/cerrar.
  - 🪟 **Ventanas**: Cortan el muro, tienen animación de apertura.
  - 🔥 **Calefactores**: Se colocan en el suelo, tienen efecto de calor visual.
  - ❄️ **Aires Acondicionados**: Se montan en la pared (unidad exterior).

- **Interacción**:
  - **Clic Derecho**: Abre el menú contextual para añadir objetos en la posición del cursor.
  - **Arrastrar y Soltar**: Puedes mover los objetos una vez colocados manteniendo presionado el clic izquierdo.
  - **Clic Izquierdo**: Interactúa con el objeto (abrir puerta, encender calefactor).

- **Características Técnicas**:
  - **CSG (Constructive Solid Geometry)**: Puertas y ventanas realizan cortes booleanos en tiempo real sobre la malla de la pared.
  - **Validación**: El sistema impide colocar objetos superpuestos o fuera de los límites válidos.

## Notas de diseño y mantenimiento

- **Separación de responsabilidades**: La lógica de Three.js está en `hooks/` y `entities/`. React solo orquesta y muestra UI.
- **Rendimiento**: Las operaciones CSG (`three-bvh-csg`) son costosas. Se ejecutan solo al finalizar el arrastre de una puerta/ventana para evitar congelamientos durante el movimiento.
- **Limpieza**: Se usa `disposeUtils.js` para asegurar que geometrías y materiales se liberen de la memoria GPU al eliminar objetos.

## Cómo contribuir / probar cambios

1. Instalar dependencias:
```powershell
npm install --legacy-peer-deps
```

2. Levantar servidor dev:
```powershell
npm run dev
```

## Problemas conocidos

- **Jank en CSG**: Al soltar una puerta/ventana, puede haber un leve parpadeo o pausa mientras se recalcula la geometría de la pared.
- **Sombras**: La configuración actual de sombras está optimizada para rendimiento, puede haber artefactos menores en ángulos rasantes.

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
