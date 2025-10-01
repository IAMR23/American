// BarraDeslizante.jsx
import React from "react";

export default function BarraDeslizante({ texto, isFullscreen = false }) {
  // Ajuste de tamaño de letra según pantalla
  let fontSize;
  if (isFullscreen) {
    fontSize = "70px";
  } else if (window.innerWidth >= 1200) { // pantallas grandes
    fontSize = "35px"; // un poco más pequeña
  } else {
    fontSize = "40px"; // tamaño normal
  }

  const animationDuration = isFullscreen ? "25s" : "15s"; // más lento en fullscreen

  return (
    <div
      style={{
        position: "absolute",
        top: "30%",
        width: "100%",
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
          fontSize,
          WebkitTextStroke: "2px gray",
          animation: `mover ${animationDuration} linear infinite`,
        }}
      >
        {texto}
      </div>

      <style>
        {`
          @keyframes mover {
            0%   { transform: translateX(100vw); }   /* fuera de la pantalla a la derecha */
            100% { transform: translateX(-100%); }   /* se va completamente a la izquierda */
          }
        `}
      </style>
    </div>
  );
}
