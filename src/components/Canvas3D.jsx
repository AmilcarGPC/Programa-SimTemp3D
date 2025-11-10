import React from "react";
import "./Canvas3D.css";

/**
 * Contenedor del canvas 3D
 */
const Canvas3D = React.forwardRef((props, ref) => {
  return <div ref={ref} className="canvas-3d" />;
});

Canvas3D.displayName = "Canvas3D";

export default Canvas3D;
