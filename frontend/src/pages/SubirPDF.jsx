import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function SubirPDFPremium() {
  const [archivo, setArchivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!archivo) {
      setMensaje({ tipo: "danger", texto: "Selecciona un archivo PDF." });
      return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      setLoading(true);
      setMensaje(null);

      const res = await axios.post(
        `${API_URL}/pdf/upload-pdf`,
        formData
      );

      setMensaje({
        tipo: "success",
        texto: "Documento subido correctamente."
      });

    } catch (error) {
      setMensaje({
        tipo: "danger",
        texto: "Error al subir el documento."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container vh-100 d-flex align-items-center justify-content-center ">
      <div className="card shadow-lg border-0 p-4" style={{ width: "480px", borderRadius: "18px" }}>
        
        <div className="text-center mb-4">
          <h3 className="fw-bold">Subir Documento</h3>
          <p className="text-muted mb-0">
            Carga tu archivo PDF de forma segura
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Seleccionar PDF</label>
            <input
              type="file"
              accept="application/pdf"
              className="form-control"
              onChange={(e) => setArchivo(e.target.files[0])}
            />
            <div className="form-text">
              Tamaño máximo permitido: 50MB
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-dark w-100"
            disabled={loading}
            style={{ borderRadius: "10px" }}
          >
            {loading ? "Subiendo..." : "Subir Documento"}
          </button>
        </form>

        {mensaje && (
          <div className={`alert alert-${mensaje.tipo} mt-3`} role="alert">
            {mensaje.texto}
          </div>
        )}

      </div>
    </div>
  );
}
