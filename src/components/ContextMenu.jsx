import React from "react";
import "./ContextMenu.css";

const ContextMenu = ({
  position,
  onClose,
  onSelectComponent,
  onDeleteObject,
  isDarkMode = true,
}) => {
  if (!position) return null;

  const typeMap = {
    door: { icon: "🚪", label: "Puerta" },
    window: { icon: "🪟", label: "Ventana" },
    heater: { icon: "🔥", label: "Calefactor" },
    aircon: { icon: "❄️", label: "Aire Acondicionado" },
  };
  const objInfo = position.object
    ? typeMap[position.object.type] || {
        icon: "❓",
        label: position.object.type || "Objeto",
      }
    : null;

  const handleSelect = (componentType) => {
    onSelectComponent(componentType);
    onClose();
  };

  const handleOverlayClick = (e) => {
    e.stopPropagation();
    onClose();
  };

  const handleOverlayContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <>
      {/* Overlay invisible para cerrar el menú */}
      <div
        className="context-menu-overlay"
        onClick={handleOverlayClick}
        onContextMenu={handleOverlayContextMenu}
      />

      {/* Menú */}
      <div
        className={`context-menu ${
          isDarkMode ? "context-menu--dark" : "context-menu--light"
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {position.object ? (
          <>
            <div className="context-menu-header">Objeto</div>
            <div className="context-menu-divider" />
            <div className="context-menu-item">
              <span className="context-menu-icon">{objInfo.icon}</span>
              <span>{objInfo.label}</span>
            </div>

            <div className="context-menu-divider" />
            <button
              className="context-menu-item remove"
              onClick={() => {
                if (onDeleteObject) onDeleteObject(position.object);
                onClose();
              }}
            >
              <span className="context-menu-icon">✕</span>
              <span>Eliminar</span>
            </button>

            <button className="context-menu-item cancel" onClick={onClose}>
              <span>Cancelar</span>
            </button>
          </>
        ) : (
          <>
            <div className="context-menu-header">Añadir Componente</div>
            <div className="context-menu-divider" />

            <button
              className="context-menu-item"
              onClick={() => handleSelect("door")}
            >
              <span className="context-menu-icon">🚪</span>
              <span>Puerta</span>
            </button>

            <button
              className="context-menu-item"
              onClick={() => handleSelect("window")}
            >
              <span className="context-menu-icon">🪟</span>
              <span>Ventana</span>
            </button>

            <button
              className="context-menu-item"
              onClick={() => handleSelect("heater")}
            >
              <span className="context-menu-icon">🔥</span>
              <span>Calefactor</span>
            </button>

            <button
              className="context-menu-item"
              onClick={() => handleSelect("aircon")}
            >
              <span className="context-menu-icon">❄️</span>
              <span>Aire Acondicionado</span>
            </button>

            <div className="context-menu-divider" />

            <button className="context-menu-item cancel" onClick={onClose}>
              <span>Cancelar</span>
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default ContextMenu;
