import React from "react";
import "./ProjectHeader.css";

/**
 * Header del proyecto con título y logo
 */
const ProjectHeader = ({ isDarkMode = true }) => {
  return (
    <div
      className={`project-header ${
        isDarkMode ? "project-header--dark" : "project-header--light"
      }`}
    >
      <div className="project-header__logo">🏠</div>
      <div className="project-header__content">
        <h1 className="project-header__title">Simulador de Temperatura 3D</h1>
        <p className="project-header__subtitle">
          Análisis de transferencia de calor
        </p>
      </div>
    </div>
  );
};

export default ProjectHeader;
