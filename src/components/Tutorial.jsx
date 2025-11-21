import { useState, useEffect } from "react";
import "./Tutorial.css";

/**
 * Tutorial interactivo para el simulador térmico
 * Guía al usuario por las funcionalidades principales
 */
const Tutorial = ({ isDarkMode = true, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animación de entrada
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    {
      title: "Bienvenido al Simulador Térmico",
      content:
        "Este tutorial te guiará por las funcionalidades principales del simulador. Puedes cerrarlo en cualquier momento y volver a abrirlo desde el panel de control.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect
            x="8"
            y="8"
            width="32"
            height="32"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M24 16v16M16 24h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
      highlight: null,
    },
    {
      title: "Panel de Control",
      content:
        "En el panel derecho encontrarás todos los controles de simulación. Puedes modificar las temperaturas externa e interna usando los sliders.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect
            x="12"
            y="8"
            width="24"
            height="32"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="24" cy="16" r="2" fill="currentColor" />
          <path
            d="M18 24h12M18 28h8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
      highlight: "control-panel",
      position: "left",
    },
    {
      title: "Temperaturas",
      content:
        "Los sliders de temperatura permiten configurar las condiciones iniciales. Al cambiarlos, la simulación se reinicia con los nuevos valores.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect
            x="20"
            y="8"
            width="8"
            height="24"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="24" cy="36" r="6" stroke="currentColor" strokeWidth="2" />
          <path d="M24 14v14" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      highlight: "temperatures",
      position: "left",
    },
    {
      title: "Visualización de la Grilla",
      content:
        'Activa "Mostrar Grilla" para ver las partículas térmicas. Puedes ajustar la densidad (1x1, 2x2, 4x4, 8x8) y la velocidad de simulación.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M12 12h8v8h-8zM28 12h8v8h-8zM12 28h8v8h-8zM28 28h8v8h-8z"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      ),
      highlight: "grid-controls",
      position: "left",
    },
    {
      title: "Añadir Entidades",
      content:
        "Haz clic derecho sobre un muro o piso para abrir el menú contextual. Desde ahí puedes añadir puertas, ventanas, aires acondicionados y calefactores.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect
            x="8"
            y="8"
            width="32"
            height="32"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M24 18v12M18 24h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
      highlight: null,
      position: "center",
    },
    {
      title: "Mover Entidades",
      content:
        "Arrastra cualquier entidad con el ratón para reposicionarla. Si intentas colocarla en una posición inválida, verás una alerta explicando el problema.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M24 8l4 4m-4-4l-4 4m4-4v16M8 24l4-4m-4 4l4 4m-4-4h16M40 24l-4-4m4 4l-4 4m4-4H24M24 40l4-4m-4 4l-4-4m4 4V24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
      highlight: null,
      position: "center",
    },
    {
      title: "Eliminar Entidades",
      content:
        "Haz clic derecho sobre una entidad existente para eliminarla. El menú contextual te mostrará la opción de borrado.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M16 12h16M14 16h20l-2 20H16l-2-20z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M20 8h8v4h-8z" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      highlight: null,
      position: "center",
    },
    {
      title: "Barra de Información",
      content:
        "En la parte inferior encontrarás la leyenda de colores (temperatura-color) y la temperatura promedio interior en tiempo real.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect
            x="8"
            y="28"
            width="32"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="14" cy="34" r="2" fill="currentColor" />
          <circle cx="22" cy="34" r="2" fill="currentColor" />
          <circle cx="30" cy="34" r="2" fill="currentColor" />
        </svg>
      ),
      highlight: "metrics-bar",
      position: "top",
    },
    {
      title: "Botón de Reinicio",
      content:
        'El botón "Reiniciar Simulación" restablece las temperaturas a sus valores por defecto y limpia el historial térmico.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M40 24c0 8.837-7.163 16-16 16S8 32.837 8 24 15.163 8 24 8c4.418 0 8.418 1.791 11.314 4.686"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M32 8h8v8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      highlight: "reset-button",
      position: "left",
    },
    {
      title: "¡Listo para Empezar!",
      content:
        "Ya conoces todas las funcionalidades. Explora el simulador y experimenta con diferentes configuraciones para ver cómo se comporta la transferencia de calor.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle
            cx="24"
            cy="24"
            r="16"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M16 24l6 6 12-12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      highlight: null,
      position: "center",
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const handleSkip = () => {
    // Marcar tutorial como completado en localStorage
    localStorage.setItem("tutorial-completed", "true");
    handleClose();
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Remove blur from highlighted section
  useEffect(() => {
    // Remove highlight from all elements first
    const allHighlightIds = [
      "control-panel",
      "temperatures",
      "grid-controls",
      "metrics-bar",
      "reset-button",
    ];
    allHighlightIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove("tutorial-highlight");
        el.classList.remove("tutorial-highlight-elevated");
      }
    });

    // Add highlight to current step element
    if (step.highlight) {
      const element = document.getElementById(step.highlight);
      if (element) {
        element.classList.add("tutorial-highlight");

        // Steps 2, 3, 4, and 9 need elevated control panel (indices 1, 2, 3, 8)
        const shouldElevatePanel = [1, 2, 3, 8].includes(currentStep);
        if (shouldElevatePanel) {
          const controlPanel = document.getElementById("control-panel");
          if (controlPanel) {
            controlPanel.classList.add("tutorial-highlight-elevated");
          }
        }

        // Step 8 needs elevated metrics bar (index 7)
        if (currentStep === 7 && step.highlight === "metrics-bar") {
          element.classList.add("tutorial-highlight-elevated");
        }
      }
    }

    // Cleanup
    return () => {
      const allIds = [
        "control-panel",
        "temperatures",
        "grid-controls",
        "metrics-bar",
        "reset-button",
      ];
      allIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove("tutorial-highlight");
          el.classList.remove("tutorial-highlight-elevated");
        }
      });
    };
  }, [currentStep, step.highlight]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`tutorial-overlay ${
          isVisible ? "tutorial-overlay--visible" : ""
        }`}
        onClick={handleClose}
      />

      {/* Tutorial Card */}
      <div
        className={`tutorial-card ${
          isVisible ? "tutorial-card--visible" : ""
        } ${
          isDarkMode ? "tutorial-card--dark" : "tutorial-card--light"
        } tutorial-card--${step.position || "center"}`}
      >
        {/* Header */}
        <div className="tutorial-header">
          <div className="tutorial-step-counter">
            Paso {currentStep + 1} de {steps.length}
          </div>
          <button
            className="tutorial-close-btn"
            onClick={handleClose}
            aria-label="Cerrar tutorial"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5l10 10M15 5l-10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="tutorial-progress-bar">
          <div
            className="tutorial-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="tutorial-content">
          {step.icon && <div className="tutorial-icon">{step.icon}</div>}
          <h3 className="tutorial-title">{step.title}</h3>
          <p className="tutorial-description">{step.content}</p>
        </div>

        {/* Navigation */}
        <div className="tutorial-navigation">
          <button
            className="tutorial-btn tutorial-btn-secondary"
            onClick={handleSkip}
          >
            {currentStep === 0 ? "Omitir Tutorial" : "Cerrar"}
          </button>

          <div className="tutorial-nav-buttons">
            {currentStep > 0 && (
              <button
                className="tutorial-btn tutorial-btn-secondary"
                onClick={handlePrevious}
              >
                Anterior
              </button>
            )}
            <button
              className="tutorial-btn tutorial-btn-primary"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? "Finalizar" : "Siguiente"}
            </button>
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="tutorial-dots">
          {steps.map((_, index) => (
            <button
              key={index}
              className={`tutorial-dot ${
                index === currentStep ? "tutorial-dot--active" : ""
              }`}
              onClick={() => setCurrentStep(index)}
              aria-label={`Ir al paso ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default Tutorial;
