import React from "react";

export default function Footer() {
  return (
    <footer className="bg-primary">
      <a
        href="https://github.com/IAMR23"
        target="_blank"
        rel="noopener noreferrer"
        className="d-flex justify-content-center align-items-center text-center p-4 text-white text-decoration-none"
        style={{ transition: "transform 0.2s" }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        aria-label="Ir al perfil de GitHub de Ismael Simbaña"
      >
        <span className="subtitle">
          © Todos los derechos reservados. | 2025
        </span>
      </a>
    </footer>
  );
}
