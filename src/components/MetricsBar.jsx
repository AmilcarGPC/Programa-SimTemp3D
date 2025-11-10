import React from "react";
import "./MetricsBar.css";

/**
 * Barra de métricas inferior
 */
const MetricsBar = ({ fps, objectCount = 12 }) => {
  return (
    <div className="metrics-bar">
      <div className="metrics-bar__item">
        <span className="metrics-bar__label">FPS:</span> {fps}
      </div>
      <div className="metrics-bar__item">
        <span className="metrics-bar__label">Objetos:</span> {objectCount}
      </div>
      <div className="metrics-bar__item">
        <span className="metrics-bar__label">Estado:</span>{" "}
        <span className="metrics-bar__status--stable">Estable</span>
      </div>
      <div className="metrics-bar__signature">Three.js | Low Poly Style</div>
    </div>
  );
};

export default MetricsBar;
