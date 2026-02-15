import React, { useState, useEffect } from "react";
import axios from "axios";
import { useBackground } from "../hooks/BackgroundContext";

const fondos = Array.from({ length: 21 }, (_, i) => `/fondos/${i + 1}.webp`);

const AyudaPage = () => {
  const [activo, setActivo] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setBackground } = useBackground();

  useEffect(() => {
    const obtenerUltimoPdf = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/pdf/ultimo-pdf"
        );

        if (res.data.file) {
          setPdfUrl(
            `http://localhost:5000/uploads/${res.data.file}`
          );
        }
      } catch (error) {
        console.error("Error obteniendo PDF:", error);
      } finally {
        setLoading(false);
      }
    };

    obtenerUltimoPdf();
  }, []);

  const toggle = (index) => {
    setActivo(activo === index ? null : index);
  };

  return (
    <div className="bg-primary p-2 m-2">
      
      {/* ================= FONDOS ================= */}
      <div style={{ padding: "20px", color: "white" }}>
        <h1 style={{ color: "white" }}>Selecciona un fondo</h1>

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

      {/* ================= PDF ================= */}
      <h3 className="text-white mt-3">Funcionamiento del Sistema</h3>

      <div
        className="border rounded p-2 bg-white"
        style={{ maxHeight: "800px", overflowY: "auto" }}
      >
        <div className="mb-2">
          <button
            className="btn btn-dark w-100 text-start"
            onClick={() => toggle(0)}
            aria-expanded={activo === 0}
          >
            Cómo funciona el sistema
          </button>

          <div className={`collapse ${activo === 0 ? "show" : ""}`}>
            {loading && (
              <div className="text-center p-3">
                Cargando documento...
              </div>
            )}

            {!loading && pdfUrl && (
              <div className="mt-3 shadow rounded">
                <iframe
                  src={pdfUrl}
                  title="Manual del Sistema"
                  width="100%"
                  height="900px"
                  style={{ border: "none", borderRadius: "8px" }}
                />
              </div>
            )}

            {!loading && !pdfUrl && (
              <div className="alert alert-warning mt-3">
                No hay documento disponible.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default AyudaPage;
