import React from "react";
import "./MetricsBar.css";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const toHsl = (t, min = -10, max = 45) => {
  const alpha = (clamp(t, min, max) - min) / (max - min);
  const h = 0.66 * (1.0 - alpha);
  return `hsl(${h * 360}deg 100% 50%)`;
};

const MetricsBar = ({ avgInternal = null, isDarkMode = true }) => {
  const min = -10;
  const max = 45;
  const mid = (min + max) / 2;
  const q1 = Math.round(min + (max - min) * 0.33);
  const q2 = Math.round(min + (max - min) * 0.66);

  const legendItems = [
    { t: min, label: "Azul oscuro (muy frío)" },
    { t: q1, label: "Cian (frío)" },
    { t: q2, label: "Amarillo (cálido)" },
    { t: max, label: "Rojo (muy caliente)" },
  ];

  return (
    <div
      id="metrics-bar"
      className={`metrics-bar metrics-bar--legend ${
        isDarkMode ? "metrics-bar--dark" : "metrics-bar--light"
      }`}
    >
      <div className="metrics-bar__legend">
        <div style={{ display: "flex", gap: 12 }}>
          {legendItems.map((it) => (
            <div
              key={it.t}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <div
                style={{
                  width: 18,
                  height: 12,
                  background: toHsl(it.t),
                  borderRadius: 2,
                  border: isDarkMode
                    ? "1px solid rgba(0,0,0,0.2)"
                    : "1px solid rgba(0,0,0,0.15)",
                }}
              />
              <div
                style={{ fontSize: 12, color: isDarkMode ? "#fff" : "#1a1a2e" }}
              >{`${it.label} — ${it.t}°C`}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="metrics-bar__avg" style={{ marginLeft: 24 }}>
        <div className="metrics-bar__label">Temp. Interior promedio:</div>
        <div className="metrics-bar__value">
          {avgInternal === null ? "—" : `${avgInternal.toFixed(1)}°C`}
        </div>
      </div>
    </div>
  );
};

export default MetricsBar;
