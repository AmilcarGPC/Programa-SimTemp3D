import React from "react";
import "./DoorControl.css";

const DoorControl = ({
  doors,
  onToggleDoor,
  onRemoveDoor,
  onClearAll,
  onRebuildWalls,
}) => {
  return (
    <div className="door-control">
      <h3>🚪 Control de Puertas</h3>

      <div className="door-control-section">
        <h4>Puertas Colocadas ({doors.length})</h4>
        {doors.length === 0 ? (
          <p className="no-doors-text">No hay puertas colocadas</p>
        ) : (
          <div className="doors-list">
            {doors.map((door) => (
              <div key={door.id} className="door-item">
                <div className="door-info">
                  <span className="door-position">
                    ({door.position.x.toFixed(1)}, {door.position.z.toFixed(1)})
                  </span>
                  <span className="door-direction">{door.direction}</span>
                </div>
                <div className="door-actions">
                  <button
                    className="door-action-button toggle"
                    onClick={() => onToggleDoor(door.id)}
                    title="Abrir/Cerrar"
                  >
                    🔄
                  </button>
                  <button
                    className="door-action-button remove"
                    onClick={() => onRemoveDoor(door.id)}
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

      {doors.length > 0 && (
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

      <div className="door-control-help">
        <small>
          💡 <strong>Clic derecho</strong> en un muro para añadir puerta
          <br />
          🖱️ <strong>Mantén y arrastra</strong> para mover una puerta
          <br />
          🖱️ <strong>Clic</strong> en una puerta para abrir/cerrar
        </small>
      </div>
    </div>
  );
};

export default DoorControl;
