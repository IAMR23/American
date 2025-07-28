import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { FiThumbsUp } from "react-icons/fi";

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

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

  const eliminarTodas = async () => {
    if (!window.confirm("¿Estás seguro de eliminar todas las solicitudes?")) return;

    try {
      await axios.delete(`${API_URL}/solicitud/all`);
      setSolicitudes([]); // limpiar el estado
    } catch (err) {
      console.error("Error al eliminar solicitudes", err);
    }
  };

  useEffect(() => {
    obtenerSolicitudes();
  }, []);

  return (
    <div className="">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Solicitudes de Canciones</h2>
        <button className="btn btn-danger" onClick={eliminarTodas}>
          Eliminar todo
        </button>
      </div>

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
