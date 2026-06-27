import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { FiThumbsUp } from "react-icons/fi";
import PaginationControls from "./PaginationControls";
import { confirmAction } from "../utils/swalAlerts";

const PAGE_LIMIT = 20;

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const obtenerSolicitudes = async () => {
    try {
      setCargando(true);
      const res = await axios.get(`${API_URL}/solicitud`, {
        params: { page, limit: PAGE_LIMIT },
      });
      setSolicitudes(res.data.solicitudes || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Error al obtener solicitudes", err);
    } finally {
      setCargando(false);
    }
  };

  const eliminarTodas = async () => {
    const confirmed = await confirmAction({
      title: "Eliminar solicitudes",
      text: "Estas seguro de eliminar todas las solicitudes?",
      confirmButtonText: "Si, eliminar todo",
    });
    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/solicitud/all`);
      setSolicitudes([]); // limpiar el estado
      setTotal(0);
      setTotalPages(1);
      setPage(1);
    } catch (err) {
      console.error("Error al eliminar solicitudes", err);
    }
  };

  useEffect(() => {
    obtenerSolicitudes();
  }, [page]);

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

          <PaginationControls
            page={page}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

