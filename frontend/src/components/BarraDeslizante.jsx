// BarraDeslizante.jsx
import React from "react";

export default function BarraDeslizante({ texto, isFullscreen = false }) {
  // Ajuste de tamaño de letra según pantalla
  let fontSize;
  if (isFullscreen) {
    fontSize = "60px";
  } else if (window.innerWidth >= 1200) {
    // pantallas grandes
    fontSize = "30px"; // un poco más pequeña
  } else {
    fontSize = "20px"; // tamaño normal
  }

  const animationDuration = isFullscreen ? "25s" : "22s"; // más lento en fullscreen

  return (
    <div
      style={{
        position: "absolute",
        top: "25vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          display: "inline-block",
          padding: "10px",
          fontWeight: "bold",
          fontSize,
          fontFamily: "'BBH Sans Hegarty', sans-serif", // fuente personalizada
          WebkitTextStroke: "2px black", // borde gris
          animation: `mover ${animationDuration} linear infinite`,
        }}
      >
        {texto}
      </div>

      <style>
        {`


      @font-face {
  font-family: "Jacques Francois Shadow", serif;
  font-weight: 400;
  font-style: normal;
}


      @keyframes mover {
        0%   { transform: translateX(100vw); }
        100% { transform: translateX(-100%); }
      }
    `}
      </style>
    </div>
  );
}
