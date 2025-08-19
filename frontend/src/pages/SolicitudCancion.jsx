import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FiThumbsUp } from "react-icons/fi";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";

const SolicitudesCancion = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cantante, setCantante] = useState("");
  const [cancion, setCancion] = useState("");
  const [userId, setUserId] = useState("");
  const [vista, setVista] = useState("solicitar");
  const [yaSolicito, setYaSolicito] = useState(false); // 👈 Nuevo estado

  const API_SOLICITUD = `${API_URL}/solicitud`;

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.userId);
        obtenerSolicitudes(decoded.userId);
      } catch (error) {
        console.error("Error al decodificar el token", error);
      }
    }
  }, []);

  const obtenerSolicitudes = async (idUsuario) => {
    try {
      const res = await axios.get(API_SOLICITUD);
      setSolicitudes(res.data);

      // Verificar si el usuario ya tiene una solicitud creada
      if (idUsuario) {
        const existe = res.data.some(s => s.usuario?._id === idUsuario);
        setYaSolicito(existe);
      }
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
      obtenerSolicitudes(userId);
    } catch (error) {
      console.error("Error al crear solicitud", error);
    }
  };

  const votarSolicitud = async (id) => {
    try {
      await axios.post(`${API_SOLICITUD}/${id}/votar`, { usuario: userId });
      obtenerSolicitudes(userId);
    } catch (error) {
      alert(error.response?.data?.mensaje || "Error al votar");
    }
  };

  return (
    <div className="container my-4 bg-dark p-4 rounded">
      <h2 className="mb-4 text-white">Solicitudes de Canciones</h2>

      {/* Botones para alternar vista */}
      <div className="mb-4 d-flex gap-2">
        <button
          className={`btn ${vista === "solicitar" ? "btn-danger" : "btn-primary"}`}
          onClick={() => setVista("solicitar")}
        >
          Solicitar Canción
        </button>
        <button
          className={`btn ${vista === "votar" ? "btn-danger" : "btn-primary"}`}
          onClick={() => setVista("votar")}
        >
          Votar
        </button>
      </div>

      {/* Vista de solicitar */}
      {vista === "solicitar" && (
        yaSolicito ? (
          <div className="alert alert-info">
            Ya has enviado una solicitud de canción.
          </div>
        ) : (
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
        )
      )}

      {/* Vista de votar */}
      {vista === "votar" && (
        <div
          className="list-group"
          style={{ maxHeight: "400px", overflowY: "auto" }}
        >
          {(() => {
            const yaVotoEnAlgo = solicitudes.some(s => s.votos?.includes(userId));
            return solicitudes.slice(0, 10).map((sol) => {
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
                    <p className="mb-1">
                      <strong>Cantante:</strong> {sol.cantante} <br />
                      <strong>Canción:</strong> {sol.cancion}
                    </p>
                  </div>

                  <div className="d-flex flex-column align-items-end gap-2">
                    <button
                      className="btn btn-outline-success btn-sm d-flex align-items-center"
                      onClick={() => votarSolicitud(sol._id)}
                      disabled={yaVoto || (yaVotoEnAlgo && !yaVoto)}
                      title={
                        yaVoto
                          ? "Ya votaste esta canción"
                          : yaVotoEnAlgo
                          ? "Ya votaste por otra canción"
                          : "Votar"
                      }
                    >
                      <FiThumbsUp className="me-1" />
                      {sol.votos?.length || 0}
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};

export default SolicitudesCancion;
