import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { FiThumbsUp } from "react-icons/fi";

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerSolicitudes = async () => {
      try {
        const res = await axios.get(`${API_URL}/solicitud`);
        setSolicitudes(res.data);
      } catch (err) {
        console.error("Error al obtener solicitudes", err);
      } finally {
        setCargando(false);
      }
    };

    obtenerSolicitudes();
  }, []);

  return (
    <div className="">
      <h2 className="fw-bold mb-4">Solicitudes de Canciones</h2>

      {cargando ? (
        <p>Cargando solicitudes...</p>
      ) : solicitudes.length === 0 ? (
        <p>No hay solicitudes aún.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-bordered text-center align-middle">
            <thead className="table-light">
              <tr>
                <th>Canción</th>
                <th>Cantante</th>
                <th>Solicitado por</th>
                <th>Votos</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s._id}>
                  <td>{s.cancion}</td>
                  <td>{s.cantante}</td>
                  <td>{s.usuario?.nombre || "Anónimo"}</td>
                  <td className="text-primary fw-semibold">
                    <FiThumbsUp className="me-1 text-primary" />
                    {s.totalVotos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
