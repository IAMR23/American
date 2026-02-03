import React, { useState } from "react";
import { useBackground } from "../hooks/BackgroundContext";

const fondos = Array.from({ length: 21 }, (_, i) => `/fondos/${i + 1}.webp`);

const datosSistema = [
  {
    titulo: "Cómo funciona el sistema",
    pdfUrl: "/pdfs/ayuda.pdf",
  },
];

const AyudaPage = () => {
  const [activo, setActivo] = useState(null);
  const { setBackground } = useBackground();

  const toggle = (index) => {
    setActivo(activo === index ? null : index);
  };

  return (
    <div className="bg-primary p-2 m-2">
      <div style={{ padding: "20px", color: "white" }}>
        <h1 style={{ color: "white" }}>Selecciona un fondo</h1>

        {/* CONTENEDOR FLEX RESPONSIVE */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "15px",
            maxWidth: "100%",
          }}
        >
          {fondos.map((f, i) => (
            <button
              key={i}
              onClick={() => setBackground(f)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <img
                src={f}
                alt={`fondo-${i + 1}`}
                style={{
                  width: "120px",
                  height: "80px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  border: "2px solid white",
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <h3 className="text-white mt-3">Funcionamiento del Sistema</h3>

      <div
        className="border rounded p-2"
        style={{ maxHeight: "700px", overflowY: "auto" }}
      >
        {datosSistema.map((item, index) => (
          <div key={index} className="mb-2">
            <button
              className="btn text-white w-100 text-start"
              onClick={() => toggle(index)}
              aria-expanded={activo === index}
            >
              {item.titulo}
            </button>

            <div className={`collapse ${activo === index ? "show" : ""}`}>
              {item.pdfUrl && (
                <iframe
                  src={item.pdfUrl}
                  title={`PDF-${index}`}
                  width="100%"
                  height="900px"
                  style={{ border: "1px solid #ccc" }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AyudaPage;
