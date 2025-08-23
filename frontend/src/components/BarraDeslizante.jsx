// BarraDeslizante.jsx
import React from "react";

export default function BarraDeslizante({ texto, isFullscreen = false }) {
  const fontSize = isFullscreen ? "100px" : "40px";

  return (
    <div
      style={{
        position: "absolute",
        top: "30%",       // Ajusta según quieras
        width: "100%",    // ancho completo del contenedor del video
        overflow: "hidden",
      }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          display: "inline-block",
          padding: "10px",
          color: "gray",
          fontWeight: "bold",
          fontSize: fontSize,
          animation: "mover 10s linear infinite",
        }}
      >
        {texto}
      </div>

      <style>
        {`
          @keyframes mover {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
}
