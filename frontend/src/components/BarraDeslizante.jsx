// BarraDeslizante.jsx
import React from "react";

export default function BarraDeslizante({ texto, isFullscreen = false }) {
  // Ajuste de tamaño de letra según pantalla
  let fontSize;
  if (isFullscreen) {
    fontSize = "60px";
  } else if (window.innerWidth >= 1200) { // pantallas grandes
    fontSize = "30px"; // un poco más pequeña
  } else {
    fontSize = "20px"; // tamaño normal
  }

  const animationDuration = isFullscreen ? "25s" : "22s"; // más lento en fullscreen

  return (
    <div
      style={{
        position: "absolute",
        top: "10vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          display: "inline-block",
          padding: "10px",
          color: "white",           // texto blanco
          fontWeight: "bold",
          fontSize,
          WebkitTextStroke: "2px gray", // contorno negro
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
