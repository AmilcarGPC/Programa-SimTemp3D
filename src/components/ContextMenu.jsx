import React from "react";
import "./ContextMenu.css";

/**
 * Menú contextual que aparece al hacer clic derecho en un muro
 */
const ContextMenu = ({ position, onClose, onSelectComponent }) => {
  if (!position) return null;

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
        className="context-menu"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
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

        <button className="context-menu-item" disabled title="Próximamente">
          <span className="context-menu-icon">🔥</span>
          <span>Calefactor</span>
        </button>

        <div className="context-menu-divider" />

        <button className="context-menu-item cancel" onClick={onClose}>
          <span>Cancelar</span>
        </button>
      </div>
    </>
  );
};

export default ContextMenu;
