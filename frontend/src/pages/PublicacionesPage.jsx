import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";

export default function PublicacionesPage() {
  const navigate = useNavigate();
  const [publicaciones, setPublicaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const API_PUBLICACION = `${API_URL}/publicacion`;

  // Lista de botones con valor real y nombre visible
  const listaBotones = [
    { value: "boton1", label: "Celeste" },
    { value: "boton2", label: "Rojo" },
    { value: "boton3", label: "Verde" },
    { value: "boton4", label: "Rosado" },
    { value: "boton5", label: "Cafe" },
    { value: "boton6", label: "Verde" },
    { value: "boton7", label: "Morado" },
    { value: "boton8", label: "Gris" },
    { value: "boton9", label: "Azul" },
    { value: "boton10", label: "Rojo Oscuro" },
  ];
  useEffect(() => {
    cargarPublicaciones();
  }, []);

  const cargarPublicaciones = async () => {
    try {
      setCargando(true);
      const res = await axios.get(API_PUBLICACION);
      setPublicaciones(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error al cargar publicaciones");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="vh-100 fondo ">
      <div className="container-fluid overflow-hidden px-2 px-md-4 py-3 d-flex flex-column justify-content-center align-items-center">
        <div className="d-flex flex-wrap justify-content-center align-items-center w-100 gap-3 mb-4">
          <img
            src="./icono.png"
            alt="icono"
            style={{ width: "60px", height: "auto" }}
          />
          <img
            onClick={() => navigate("/")}
            src="./logo.png"
            alt="logo"
            className="img-fluid"
            style={{
              width: "80%",
              maxWidth: "600px",
              cursor: "pointer",
              minWidth: "250px",
            }}
          />
        </div>

        <h1 className="text-white">Galeria a otros</h1>

        {error && <div className="alert alert-danger">{error}</div>}
        {cargando && <p>Cargando publicaciones...</p>}

        <div className="d-flex flex-wrap justify-content-center gap-3">
          {publicaciones.map((pub) => {
            const botonClase = pub.boton || "";
            return (
              <button
                key={pub._id}
                className={botonClase}
                onClick={() => window.open(pub.mediaUrl, "_blank")}
              >
                {pub.titulo}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
