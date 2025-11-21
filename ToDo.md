# Simulador Térmico 3D (React + Vite + Three.js)

## Proyecto

### 1. **Simulación de Temperatura (El núcleo crítico)**
**Complejidad: MEDIA-ALTA**

Incluso "simplificado", necesitas:
- **Ecuación de difusión del calor** discretizada (probablemente método de diferencias finitas)
- **Grid 3D para cálculos** (separado del visual)
- **Actualización en tiempo real** de cientos/miles de puntos
- **Condiciones de frontera** (paredes, ventanas abiertas/cerradas)
- **Fuentes de calor/frío** (electrodomésticos)

**Tiempo estimado:** 2-3 días solo para esto

### 2. **Sistema de Visualización de Temperatura**
**Complejidad: MEDIA**

- Renderizar cientos de puntos 3D (THREE.Points o instanced meshes)
- Sistema de colores basado en temperatura (gradient azul→rojo)
- Opción de "difuminado" (esto puede ser shader-based o post-processing)
- Actualizar colores en tiempo real según simulación

**Tiempo estimado:** 1-2 días

### 3. **Interfaz de Usuario**
**Complejidad: MEDIA**

Necesitas:
- Controles para temperatura inicial (interna/externa)
- Menú para añadir objetos (ventanas, puertas, electrodomésticos)
- Sistema de posicionamiento en cuadrícula
- Toggle on/off para electrodomésticos
- Toggle abrir/cerrar para puertas/ventanas
- Control de densidad de puntos
- Control de difuminado

**Tiempo estimado:** 1-2 días

### 4. **Modelado 3D y Escena**
**Complejidad: BAJA-MEDIA**

- Terreno con detalles (árboles, etc.)
- Casa (paredes, sin techo)
- Modelos low poly de electrodomésticos
- Ventanas y puertas

**Tiempo estimado:** 1 día (si usas assets existentes o geometrías simples)

***

## 📊 Distribución de Tiempo Sugerida (7 días)

| Día | Tarea | Prioridad |
|-----|-------|-----------|
| **1-2** | Escena básica Three.js + casa + cámara + controles | CRÍTICA |
| **2-3** | Sistema de grid de temperatura + ecuación de calor simplificada | CRÍTICA |
| **3-4** | Visualización de puntos 3D con colores según temperatura | CRÍTICA |
| **5** | Interfaz básica (sliders, botones) | CRÍTICA |
| **6** | Sistema para añadir/remover objetos (ventanas, electrodomésticos) | ALTA |
| **7** | Pulir, debugging, detalles visuales (árboles, difuminado) | MEDIA |

***

## 🚨 Riesgos Principales

### **1. La Física puede consumir todo el tiempo**
La simulación de calor, incluso "simple", puede volverse un rabbit hole. Ecuaciones que no convergen, comportamientos extraños, performance issues.

**Mitigación:** Define desde día 1 un modelo **súper simplificado**:
- Grid 2D en lugar de 3D (altura constante)
- Difusión solo lateral
- Fuentes de calor como valores constantes

### **2. Performance con muchos puntos**
Miles de puntos actualizándose cada frame puede ser pesado.

**Mitigación:** 
- Usa THREE.InstancedMesh o THREE.Points
- Actualiza la simulación a menor framerate que el render (ej. 10 Hz simulación, 60 Hz render)

### **3. Scope creep**
"Solo añadiré muros internos", "mejor añado una segunda planta"...

**Mitigación:** 
- Define MVP claro desde día 1
- Implementa features incrementalmente

***

## 💡 Recomendaciones para Hacerlo Factible

### **Simplificaciones sugeridas:**

1. **Temperatura en 2D, no 3D**
   - Asume altura uniforme (un solo plano)
   - Visualiza en 3D pero calcula en 2D
   - Reduce complejidad de O(n³) a O(n²)

2. **Modelo de calor ultra-simple**
   - Cada celda tiene temperatura
   - Difusión por promedios con vecinos (sin ecuaciones diferenciales complejas)
   - Ventanas abiertas = temperatura tiende a externa
   - Electrodomésticos = añaden/restan valor constante

3. **Assets pre-hechos**
   - Usa bibliotecas de modelos 3D gratuitos (Sketchfab, Three.js examples)
   - Geometrías simples de Three.js (BoxGeometry, PlaneGeometry)

4. **Difuminado simple**
   - En lugar de shaders complejos, aumenta el tamaño de cada punto
   - Usa transparencia/opacity

5. **UI minimalista**
   - Solo sliders y botones básicos HTML
   - Sin drag-and-drop complejo al inicio

***

## 🎯 Versión MVP (Mínimo Viable)

Si tuviera que priorizar para asegurar entrega:

**Semana 1 - Core:**
1. ✅ Casa cuadrada con vista top-down
2. ✅ Grid de puntos coloreados (temperatura)
3. ✅ Sliders para temperatura externa/interna
4. ✅ 1-2 tipos de objetos (ej: ventana + calefactor)
5. ✅ Botones para añadir/quitar objetos
6. ✅ Simulación básica que muestre cambio de temperatura

**Post-entrega (si hay tiempo):**
- Terreno con detalles
- Más electrodomésticos
- Difuminado
- Muros internos
- Mejores gráficos

***

## Veredicto Final

**¿Es posible en una semana?** 
- ✅ **Sí**, con el alcance correcto
- ⚠️ **Pero** requiere trabajo enfocado todos los días
- ❌ **No** si intentas hacer TODO lo que describes

**Mi consejo:**
Define un **MVP super claro** los primeros 2 días, impleméntalo en 4 días, y usa el último día para pulir. Si llegas al día 5 y el core funciona, añade features extra. Si no, al menos tienes algo funcional que muestre el concepto.

**Nivel de dificultad:** 7/10 para programador con experiencia media en JavaScript y conceptos básicos de física.

¿Quieres que profundicemos en algún aspecto específico o que discutamos estrategias de simplificación adicionales?