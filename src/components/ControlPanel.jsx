import React from "react";
import { UI_CONFIG } from "../config/sceneConfig";
import DoorControl from "./DoorControl";
import "./ControlPanel.css";

/**
 * Panel de control lateral con controles de temperatura y puertas
 */
const ControlPanel = ({
  tempExterna,
  tempInterna,
  onTempExternaChange,
  onTempInternaChange,
  doorControlProps,
}) => {
  const { external, internal } = UI_CONFIG.temperature;

  return (
    <div className="control-panel">
      <h2 className="control-panel__title">Control Térmico</h2>

      {/* Control de temperatura externa */}
      <div className="control-panel__control-group">
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

      {/* Control de puertas */}
      {doorControlProps && <DoorControl {...doorControlProps} />}

      {/* Botones de acción */}
      <div className="control-panel__actions">
        <button
          className="control-panel__button control-panel__button--add-window"
          disabled
          title="Próximamente"
        >
          + Añadir Ventana
        </button>

        <button
          className="control-panel__button control-panel__button--add-heater"
          disabled
          title="Próximamente"
        >
          + Añadir Calefactor
        </button>

        <button
          className="control-panel__button control-panel__button--reset"
          onClick={() => {
            onTempExternaChange(external.default);
            onTempInternaChange(internal.default);
          }}
        >
          🔄 Reiniciar
        </button>
      </div>

      {/* Panel de información */}
      <div className="control-panel__info">
        <p>
          <strong>Día 1:</strong> Entorno base
        </p>
        <p>Casa 10×10m sin techo</p>
        <p>Vista arquitectónica fija</p>
      </div>
    </div>
  );
};

export default ControlPanel;
