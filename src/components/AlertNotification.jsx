import { useEffect } from "react";
import "./AlertNotification.css";

/**
 * AlertNotification: Componente de notificación temporal
 *
 * @param {string} type - 'error' | 'warning' | 'info' | 'success'
 * @param {string} message - Mensaje a mostrar
 * @param {number} duration - Duración en ms (default 3000)
 * @param {function} onClose - Callback al cerrar
 * @param {boolean} isDarkMode - Tema actual
 */
const AlertNotification = ({
  type = "info",
  message,
  duration = 3000,
  onClose,
  isDarkMode = true,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "error":
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle
              cx="10"
              cy="10"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M10 6v4M10 14h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );
      case "warning":
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2L2 17h16L10 2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M10 8v4M10 15h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );
      case "success":
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle
              cx="10"
              cy="10"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M6 10l3 3 5-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default: // info
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle
              cx="10"
              cy="10"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M10 10v4M10 6h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`alert-notification alert-notification--${type} ${
        isDarkMode ? "alert-notification--dark" : "alert-notification--light"
      }`}
    >
      <div className="alert-notification-icon">{getIcon()}</div>
      <div className="alert-notification-message">{message}</div>
      <button
        className="alert-notification-close"
        onClick={onClose}
        aria-label="Cerrar notificación"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
};

export default AlertNotification;
