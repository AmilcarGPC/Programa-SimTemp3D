import React from "react";
import { UI_CONFIG } from "../config/sceneConfig";
import "./ControlPanel.css";

/**
 * Panel de control lateral con controles de temperatura y puertas
 */
const ControlPanel = ({
  tempExterna,
  tempInterna,
  onTempExternaChange,
  onTempInternaChange,
  showGrid,
  onShowGridChange,
  gridDensity,
  onGridDensityChange,
  simulationSpeed,
  onSimulationSpeedChange,
  isDarkMode,
  onToggleTheme,
  onReset,
  onOpenTutorial,
}) => {
  const { external, internal } = UI_CONFIG.temperature;

  return (
    <div
      id="control-panel"
      className={`control-panel ${
        isDarkMode ? "control-panel--dark" : "control-panel--light"
      }`}
    >
      <div className="control-panel__header">
        <h2 className="control-panel__title">Control Térmico</h2>
        <button
          id="theme-toggle"
          className="control-panel__theme-toggle"
          onClick={onToggleTheme}
          title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {isDarkMode ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Control de temperatura externa */}
      <div id="temperatures" className="control-panel__control-group">
        <label className="control-panel__label">
          Temperatura Externa: {tempExterna}°C
        </label>
        <input
          type="range"
          min={external.min}
          max={external.max}
          value={tempExterna}
          onChange={(e) => onTempExternaChange(Number(e.target.value))}
          className="control-panel__slider"
        />
      </div>

      {/* Control de temperatura interna */}
      <div className="control-panel__control-group">
        <label className="control-panel__label">
          Temperatura Interna: {tempInterna}°C
        </label>
        <input
          type="range"
          min={internal.min}
          max={internal.max}
          value={tempInterna}
          onChange={(e) => onTempInternaChange(Number(e.target.value))}
          className="control-panel__slider"
        />
      </div>

      {/* Visualización */}
      <div id="grid-controls" className="control-panel__control-group">
        <label className="control-panel__label checkbox-label">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => onShowGridChange(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          Mostrar Grid Térmico
        </label>
      </div>

      {/* Densidad del Grid */}
      <div className="control-panel__control-group">
        <label className="control-panel__label">
          Densidad: {gridDensity}x{gridDensity}
        </label>
        <input
          type="range"
          min={1}
          max={4}
          step={1}
          value={gridDensity}
          onChange={(e) => onGridDensityChange(Number(e.target.value))}
          className="control-panel__slider"
        />
      </div>

      {/* Velocidad de Simulación */}
      <div className="control-panel__control-group">
        <label className="control-panel__label">
          Velocidad de Simulación: {simulationSpeed}x
        </label>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={simulationSpeed}
          onChange={(e) => onSimulationSpeedChange(Number(e.target.value))}
          className="control-panel__slider"
        />
      </div>

      {/* Se eliminan controles de puerta/ventana: gestión externa */}

      {/* Botones de acción */}
      <div className="control-panel__actions">
        <button
          id="reset-button"
          className="control-panel__button control-panel__button--reset"
          onClick={() => {
            if (onReset) {
              onReset();
              return;
            }
            onTempExternaChange(external.default);
            onTempInternaChange(internal.default);
          }}
        >
          Reiniciar
        </button>

        {onOpenTutorial && (
          <button
            className="control-panel__button control-panel__button--tutorial"
            onClick={onOpenTutorial}
            title="Abrir tutorial interactivo"
          >
            Tutorial
          </button>
        )}
      </div>

      {/* Panel de información (eliminada la línea 'Día 1') */}
    </div>
  );
};

export default ControlPanel;
