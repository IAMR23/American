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

export default function BuscadorTabla({ onSelectAll }) {
  const [filtroActivo, setFiltroActivo] = useState("titulo");
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

  const agregarACola = async (song) => {
    if (!isAuthenticated) {
      setToastMsg("⚠️ Inicia sesión para agregar a la cola");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/t/cola/add`,
        { userId, songId: song._id },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      // Evitar duplicados en la cola
      addToQueue({
        _id: song._id,
        titulo: song.titulo,
        artista: song.artista,
        numero: song.numero,
        videoUrl: song.videoUrl,
      });

      setToastMsg(`✅ "${song.titulo}" agregada a la cola`);
    } catch (err) {
      console.error(err);
      setToastMsg("❌ No se pudo agregar a la cola");
    }
  };

  const handlePlay = async (song) => {
    if (!isAuthenticated) {
      setToastMsg("⚠️ Inicia sesión para reproducir");
      return;
    }

    try {
      // Detener cualquier reproducción existente
      const existingMedia = document.querySelector("audio, video");
      if (existingMedia) {
        existingMedia.pause();
        existingMedia.currentTime = 0;
      }

      // Agregar a la cola si no está
      await axios.post(
        `${API_URL}/t/cola/add`,
        { userId, songId: song._id, position: currentIndex },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      playNowQueue({
        _id: song._id,
        titulo: song.titulo,
        artista: song.artista,
        numero: song.numero,
        videoUrl: song.videoUrl,
      });

      setToastMsg(`▶️ Reproduciendo "${song.titulo}" ahora`);
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
    <div className="p-2">
      {/* Filtros */}
      <div className="d-flex align-items-center flex-wrap mb-3">
        {["numero", "artista", "titulo", "generos"].map((tipo) => (
          <button
            key={tipo}
            onClick={() => setFiltroActivo(tipo)}
            className={`btn me-2 ${
              filtroActivo === tipo ? "btn-danger" : "btn-primary"
            }`}
          >
            {tipo === "generos"
              ? "Género"
              : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
        <input
          type="text"
          className="form-control ms-2"
          style={{ width: "auto" }}
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div style={{ maxHeight: "600px", overflowY: "auto" }}>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cantante</th>
              <th>Canción</th>
              <th>Género</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {data.map((fila) => (
              <tr key={fila._id}>
                <td>{fila.numero}</td>
                <td>{fila.artista}</td>
                <td>{fila.titulo}</td>
                <td>{fila.generos?.nombre || "Sin género"}</td>
                <td>
                  <div class="d-flex justify-content-center align-items-center gap-2">
                    <button
                      class="btn btn-success btn-sm p-1 d-flex justify-content-center align-items-center"
                      onClick={async () => {
                        await masReproducida(fila._id);
                        handlePlay(fila);
                        onSelectAll?.();
                      }}
                    >
                      <img src="./play.png" alt="play" width="40" />
                    </button>

                    <button
                      class="btn btn-info btn-sm p-1 d-flex justify-content-center align-items-center"
                      onClick={async() => {agregarACola(fila) ; 
                        await masReproducida(fila._id)
                      }}
                    >
                      <img src="./mas.png" alt="add" width="40" />
                    </button>

                    <button
                      class="btn btn-danger btn-sm p-1 d-flex justify-content-center align-items-center"
                      onClick={() => handleOpenModal(fila._id)}
                    >
                      <img src="./heart.png" alt="fav" width="40" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
