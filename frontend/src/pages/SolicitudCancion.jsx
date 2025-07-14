import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { API_URL } from "../config"
import { getToken } from "../utils/auth";

const SolicitudesCancion = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [comentario, setComentario] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [comentarioEditado, setComentarioEditado] = useState("");
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");

  const API_SOLICITUD = `${API_URL}/solicitud`;
  const API_USER = `${API_URL}/users`; // Ajusta si tienes prefijo /api

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const id = decoded.userId;
        setUserId(id);
        obtenerUsuario(id);
        obtenerSolicitudes();
      } catch (error) {
        console.error("Error al decodificar el token", error);
      }
    }
  }, []);

  const obtenerUsuario = async (id) => {
    try {
      const res = await axios.get(`${API_USER}/${id}`);
      setUserName(res.data.user.nombre);
    } catch (error) {
      console.error("Error al obtener el nombre del usuario", error);
    }
  };

  const obtenerSolicitudes = async () => {
    try {
      const res = await axios.get(API_SOLICITUD);
      setSolicitudes(res.data);
    } catch (error) {
      console.error("Error al obtener solicitudes", error);
    }
  };

  const crearSolicitud = async () => {
    if (!comentario.trim()) return;
    try {
      await axios.post(API_SOLICITUD, {
        usuario: userId,
        comentario,
      });
      setComentario("");
      obtenerSolicitudes();
    } catch (error) {
      console.error("Error al crear solicitud", error);
    }
  };

  const eliminarSolicitud = async (id) => {
    try {
      await axios.delete(`${API_SOLICITUD}/${id}`);
      obtenerSolicitudes();
    } catch (error) {
      console.error("Error al eliminar solicitud", error);
    }
  };

  const actualizarSolicitud = async (id) => {
    try {
      await axios.put(`${API_SOLICITUD}/${id}`, {
        comentario: comentarioEditado,
      });
      setEditandoId(null);
      setComentarioEditado("");
      obtenerSolicitudes();
    } catch (error) {
      console.error("Error al actualizar solicitud", error);
    }
  };

  return (
    <div className="container my-4 bg-primary ">
      <h2 className="mb-4 text-white">Solicitudes de Canciones</h2>

      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Ingresa un comentario..."
        />
        <button className="btn btn-primary" onClick={crearSolicitud}>
          Enviar
        </button>
      </div>

      <div
        className="list-group"
        style={{
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        {solicitudes.slice(0, 5).map((sol) => (
          <div
            key={sol._id}
            className="list-group-item mb-3 border rounded shadow-sm d-flex justify-content-between align-items-start"
          >
            <div className="me-3 flex-grow-1">
              <p className="mb-1 fw-bold">
                {sol.usuario?.nombre || "Desconocido"}
              </p>

              {editandoId === sol._id ? (
                <>
                  <div className="input-group mb-2">
                    <input
                      type="text"
                      className="form-control"
                      value={comentarioEditado}
                      onChange={(e) => setComentarioEditado(e.target.value)}
                    />
                    <button
                      className="btn btn-success"
                      onClick={() => actualizarSolicitud(sol._id)}
                    >
                      Guardar
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setEditandoId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-1">{sol.comentario}</p>
                </>
              )}
            </div>

            {(userId === sol.usuario || userId === sol.usuario?._id) &&
              editandoId !== sol._id && (
                <div className="d-flex flex-column gap-2">
                  <button
                    className="btn btn-outline-primary btn-sm d-flex align-items-center"
                    onClick={() => {
                      setEditandoId(sol._id);
                      setComentarioEditado(sol.comentario);
                    }}
                    title="Editar"
                  >
                    <FiEdit size={18} />
                  </button>
                  <button
                    className="btn btn-outline-primary btn-sm d-flex align-items-center"
                    onClick={() => eliminarSolicitud(sol._id)}
                    title="Eliminar"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SolicitudesCancion;
