import React from "react";
import "./DoorControl.css";

const WindowControl = ({
  windows,
  onToggleWindow,
  onRemoveWindow,
  onClearAll,
  onRebuildWalls,
}) => {
  return (
    <div className="door-control">
      <h3>🪟 Control de Ventanas</h3>

      <div className="door-control-section">
        <h4>Ventanas Colocadas ({windows.length})</h4>
        {windows.length === 0 ? (
          <p className="no-doors-text">No hay ventanas colocadas</p>
        ) : (
          <div className="doors-list">
            {windows.map((win) => (
              <div key={win.id} className="door-item">
                <div className="door-info">
                  <span className="door-position">
                    ({win.position.x.toFixed(1)}, {win.position.z.toFixed(1)})
                  </span>
                  <span className="door-direction">{win.direction}</span>
                </div>
                <div className="door-actions">
                  <button
                    className="door-action-button toggle"
                    onClick={() => onToggleWindow(win.id)}
                    title="Abrir/Cerrar"
                  >
                    🔄
                  </button>
                  <button
                    className="door-action-button remove"
                    onClick={() => onRemoveWindow(win.id)}
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {windows.length > 0 && (
        <div className="door-control-section">
          <button
            className="door-control-button rebuild"
            onClick={onRebuildWalls}
          >
            🔨 Reconstruir Paredes
          </button>
          <button className="door-control-button clear" onClick={onClearAll}>
            🗑️ Eliminar Todas
          </button>
        </div>
      )}
    </div>
  );
};

export default WindowControl;
