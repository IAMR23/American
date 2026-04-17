import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import { jwtDecode } from "jwt-decode";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import ToastModal from "./modal/ToastModal";
import { useQueueContext } from "../hooks/QueueProvider";

const SONG_URL = `${API_URL}/song/numero`;
const FILTRO_URL = `${API_URL}/song/filtrar`;

export default function BuscadorTablaCelular({ onSelectAll, roomId }) {
  const [filtroActivo, setFiltroActivo] = useState("numero");
  const [busqueda, setBusqueda] = useState("");
  const [data, setData] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const [userId, setUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { addToQueue, playNowQueue, currentIndex } = useQueueContext();

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.userId);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    }
  }, []);

  const fetchCanciones = async () => {
    try {
      const headers = isAuthenticated
        ? { Authorization: `Bearer ${getToken()}` }
        : {};
      const url = busqueda.trim() ? FILTRO_URL : SONG_URL;
      const params = busqueda.trim() ? { busqueda, filtro: filtroActivo } : {};
      const res = await axios.get(url, { headers, params });
      setData(res.data.canciones || res.data);
    } catch (err) {
      console.error("Error al obtener canciones", err);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(fetchCanciones, 500);
    return () => clearTimeout(debounce);
  }, [busqueda, filtroActivo]);

  /*     const agregarACola = async (songId) => {
  try {

    let res;

    if (isAuthenticated) {
      res = await axios.post(
        `${API_URL}/t/cola/add`,
        { userId, songId, roomId }, // 🔥 AQUÍ
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
    } else {
      res = await axios.post(
        `${API_URL}/t/cola/without/aut/add`,
        { songId } // 🔥 AQUÍ TAMBIÉN
      );
    }

    const cancion =
      res.data.cancion || videos.find((v) => v._id === songId);

    if (!cancion) {
      setToastMsg("No se encontró la canción");
      return;
    }

    addToQueue({
      _id: cancion._id,
      titulo: cancion.titulo,
      artista: cancion.artista,
      numero: cancion.numero,
      videoUrl: cancion.videoUrl,
    });

    setToastMsg("✅ Canción agregada a la cola");
  } catch (err) {
    console.error("Error al agregar a cola:", err.response?.data || err);
    setToastMsg("❌ No se pudo agregar la canción");
  }
};
 */

  const agregarACola = async (songId) => {
    try {
      const res = await axios.post(`${API_URL}/t/cola/add2`, {
        userId,
        songId,
        roomId,
      });

      const cancion = data.find((v) => v._id === songId);

      if (!cancion) {
        setToastMsg("No se encontró la canción");
        return;
      }

      addToQueue({
        _id: cancion._id,
        titulo: cancion.titulo,
        artista: cancion.artista,
        numero: cancion.numero,
        videoUrl: cancion.videoUrl,
      });

      setToastMsg("✅ Canción agregada a la cola");
    } catch (err) {
      setToastMsg("❌ No se pudo agregar la canción");
    }
  };

  const playNow = async (video) => {
    try {
      // Detener la canción anterior
      const existingMedia = document.querySelector("audio, video");
      if (existingMedia) {
        existingMedia.pause();
        existingMedia.currentTime = 0;
      }

      // Insertar en cola backend en la posición exacta
      await axios.post(`${API_URL}/t/cola/play-now`, {
        roomId,
        songId: video._id,
      });

      setToastMsg(`▶️ Reproduciendo "${video.titulo}" ahora`);
    } catch (err) {
      console.error(err);
      setToastMsg("❌ No se pudo reproducir la canción");
    }
  };

  const handleOpenModal = (songId) => {
    if (!isAuthenticated) {
      setToastMsg("⚠️ Inicia sesión para agregar a playlist");
      return;
    }
    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  const masReproducida = async (id) => {
    await axios.post(`${API_URL}/song/${id}/reproducir`);
  };

  return (
    <div className="container-fluid px-2 px-md-3 py-2">
      {/* Filtros */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-2 p-md-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-lg">
              <div className="d-flex flex-wrap gap-2">
                {["numero", "artista", "titulo", "generos"].map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setFiltroActivo(tipo)}
                    className={`btn btn-sm px-3 py-2 ${
                      filtroActivo === tipo
                        ? "btn-danger"
                        : "btn-outline-primary"
                    }`}
                  >
                    {tipo === "generos"
                      ? "Género"
                      : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <input
                type="text"
                className="form-control"
                placeholder={`Buscar por ${
                  filtroActivo === "generos" ? "género" : filtroActivo
                }...`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla desktop / tablet */}
      <div className="card border-0 shadow-sm d-none d-md-block">
        <div className="card-body p-0">
          <div
            className="table-responsive"
            style={{ maxHeight: "600px", overflowY: "auto" }}
          >
            <table className="table table-striped table-hover align-middle mb-0">
              <thead className="table-dark sticky-top">
                <tr>
                  <th>Número</th>
                  <th>Cantante</th>
                  <th>Canción</th>
                  <th>Género</th>
                  <th className="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.map((fila) => (
                  <tr key={fila._id}>
                    <td className="fw-bold">{fila.numero}</td>
                    <td>{fila.artista}</td>
                    <td>{fila.titulo}</td>
                    <td>
                      <span className="badge bg-secondary">
                        {fila.generos?.nombre || "Sin género"}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex justify-content-center align-items-center gap-2">
                        <button
                          className="btn btn-success btn-sm p-1 d-flex justify-content-center align-items-center"
                          onClick={async () => {
                            await masReproducida(fila._id);
                            await playNow(fila);
                            onSelectAll?.();
                          }}
                        >
                          <img
                            src="/play.png"
                            alt="play"
                            className="img-fluid"
                            style={{
                              width: "34px",
                              height: "34px",
                              objectFit: "contain",
                            }}
                          />
                        </button>

                        <button
                          className="btn btn-info btn-sm p-1 d-flex justify-content-center align-items-center"
                          onClick={async () => {
                            await agregarACola(fila._id);
                            await masReproducida(fila._id);
                          }}
                        >
                          <img
                            src="/mas.png"
                            alt="add"
                            className="img-fluid"
                            style={{
                              width: "34px",
                              height: "34px",
                              objectFit: "contain",
                            }}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Vista móvil tipo cards */}
      <div className="d-block d-md-none">
        <div className="row g-2">
          {data.map((fila) => (
            <div className="col-12" key={fila._id}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="small text-muted">Número</div>
                      <div className="fw-bold fs-5">{fila.numero}</div>
                    </div>
                    <span className="badge bg-secondary">
                      {fila.generos?.nombre || "Sin género"}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="small text-muted">Cantante</div>
                    <div className="fw-semibold">{fila.artista}</div>
                  </div>

                  <div className="mb-3">
                    <div className="small text-muted">Canción</div>
                    <div>{fila.titulo}</div>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-success flex-fill d-flex justify-content-center align-items-center gap-2 py-2"
                      onClick={async () => {
                        await masReproducida(fila._id);
                        await playNow(fila);
                        onSelectAll?.();
                      }}
                    >
                      <img
                        src="/play.png"
                        alt="play"
                        style={{
                          width: "28px",
                          height: "28px",
                          objectFit: "contain",
                        }}
                      />
                      <span>Reproducir</span>
                    </button>

                    <button
                      className="btn btn-info flex-fill d-flex justify-content-center align-items-center gap-2 py-2"
                      onClick={async () => {
                        await agregarACola(fila._id);
                        await masReproducida(fila._id);
                      }}
                    >
                      <img
                        src="/mas.png"
                        alt="add"
                        style={{
                          width: "28px",
                          height: "28px",
                          objectFit: "contain",
                        }}
                      />
                      <span>Cola</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAuthenticated && (
        <PlaylistSelectorModal
          show={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          userId={userId}
          songId={selectedSongId}
        />
      )}

      <ToastModal
        mensaje={toastMsg}
        onClose={() => setToastMsg("")}
        duracion={2000}
      />
    </div>
  );
}
