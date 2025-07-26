import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FiEdit, FiTrash2, FiThumbsUp } from "react-icons/fi";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";

const SolicitudesCancion = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cantante, setCantante] = useState("");
  const [cancion, setCancion] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [cantanteEditado, setCantanteEditado] = useState("");
  const [cancionEditada, setCancionEditada] = useState("");
  const [userId, setUserId] = useState("");

  const API_SOLICITUD = `${API_URL}/solicitud`;

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.userId);
        obtenerSolicitudes();
      } catch (error) {
        console.error("Error al decodificar el token", error);
      }
    }
  }, []);

  const obtenerSolicitudes = async () => {
    try {
      const res = await axios.get(API_SOLICITUD);
      setSolicitudes(res.data);
    } catch (error) {
      console.error("Error al obtener solicitudes", error);
    }
  };

  const crearSolicitud = async () => {
    if (!cantante.trim() || !cancion.trim()) return;

    try {
      await axios.post(API_SOLICITUD, {
        usuario: userId,
        cantante,
        cancion,
      });
      setCantante("");
      setCancion("");
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
        cantante: cantanteEditado,
        cancion: cancionEditada,
      });
      setEditandoId(null);
      setCantanteEditado("");
      setCancionEditada("");
      obtenerSolicitudes();
    } catch (error) {
      console.error("Error al actualizar solicitud", error);
    }
  };

  const votarSolicitud = async (id) => {
    try {
      await axios.post(`${API_SOLICITUD}/${id}/votar`, { usuario: userId });
      obtenerSolicitudes();
    } catch (error) {
      alert(error.response?.data?.mensaje || "Error al votar");
    }
  };

  return (
    <div className="container my-4 bg-dark p-4 rounded">
      <h2 className="mb-4 text-white">Solicitudes de Canciones</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          crearSolicitud();
        }}
        className="row g-2 mb-3"
      >
        <div className="col-md-5">
          <input
            type="text"
            className="form-control"
            value={cantante}
            onChange={(e) => setCantante(e.target.value)}
            placeholder="Nombre del cantante"
            required
          />
        </div>
        <div className="col-md-5">
          <input
            type="text"
            className="form-control"
            value={cancion}
            onChange={(e) => setCancion(e.target.value)}
            placeholder="Nombre de la canción"
            required
          />
        </div>
        <div className="col-md-2">
          <button type="submit" className="btn btn-light w-100">
            Enviar
          </button>
        </div>
      </form>

      <div
        className="list-group"
        style={{ maxHeight: "400px", overflowY: "auto" }}
      >
        {solicitudes.slice(0, 10).map((sol) => {
          const yaVoto = sol.votos?.includes(userId);
          return (
            <div
              key={sol._id}
              className="list-group-item mb-3 border rounded shadow-sm d-flex justify-content-between align-items-start bg-light"
            >
              <div className="me-3 flex-grow-1">
                <p className="mb-1 fw-bold">
                  {sol.usuario?.nombre || "Desconocido"}
                </p>

                {editandoId === sol._id ? (
                  <>
                    <div className="row g-2 mb-2">
                      <div className="col-md-5">
                        <input
                          type="text"
                          className="form-control"
                          value={cantanteEditado}
                          onChange={(e) => setCantanteEditado(e.target.value)}
                          placeholder="Editar cantante"
                        />
                      </div>
                      <div className="col-md-5">
                        <input
                          type="text"
                          className="form-control"
                          value={cancionEditada}
                          onChange={(e) => setCancionEditada(e.target.value)}
                          placeholder="Editar canción"
                        />
                      </div>
                      <div className="col-md-2 d-flex gap-1">
                        <button
                          className="btn btn-success w-100"
                          onClick={() => actualizarSolicitud(sol._id)}
                        >
                          Guardar
                        </button>
                        <button
                          className="btn btn-secondary w-100"
                          onClick={() => setEditandoId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-1">
                      <strong>Cantante:</strong> {sol.cantante} <br />
                      <strong>Canción:</strong> {sol.cancion}
                    </p>
                  </>
                )}
              </div>

              <div className="d-flex flex-column align-items-end gap-2">
                <button
                  className="btn btn-outline-success btn-sm d-flex align-items-center"
                  onClick={() => votarSolicitud(sol._id)}
                  disabled={yaVoto}
                  title={yaVoto ? "Ya votaste" : "Votar"}
                >
                  <FiThumbsUp className="me-1" />
                  {sol.votos?.length || 0}
                </button>

                {(userId === sol.usuario || userId === sol.usuario?._id) &&
                  editandoId !== sol._id && (
                    <>
                      <button
                        className="btn btn-outline-primary btn-sm d-flex align-items-center"
                        onClick={() => {
                          setEditandoId(sol._id);
                          setCantanteEditado(sol.cantante);
                          setCancionEditada(sol.cancion);
                        }}
                        title="Editar"
                      >
                        <FiEdit size={18} />
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm d-flex align-items-center"
                        onClick={() => eliminarSolicitud(sol._id)}
                        title="Eliminar"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SolicitudesCancion;
