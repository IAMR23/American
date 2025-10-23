import React, { useEffect, useState } from "react";
import axios from "axios";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import ToastModal from "./modal/ToastModal";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import "../styles/listaCanciones.css";
import { useQueueContext } from "../hooks/QueueProvider";
import { useNavigate } from "react-router-dom";

const SONG_URL = `${API_URL}/song/ultsubidas`;
const FILTRO_URL = `${API_URL}/song/filtrar`;

export default function UltimasSubidas() {
  const [videos, setVideos] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [filtros, setFiltros] = useState({ busqueda: "", ordenFecha: "desc" });
  const [videoActual, setVideoActual] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const navigate = useNavigate();

  const { addToQueue, playNowQueue, changeSong, cola, setCola, currentIndex } =
    useQueueContext();

  const playNow = async (video) => {
    if (!isAuthenticated) {
      setToastMsg("⚠️ Inicia sesión para reproducir");
      return;
    }

    try {
      const token = getToken();

      // 🔴 Detener la canción anterior
      const existingMedia = document.querySelector("audio, video");
      if (existingMedia) {
        existingMedia.pause();
        existingMedia.currentTime = 0;
      }

      await axios.post(
        `${API_URL}/t/cola/add`,
        { userId, songId: video._id, position: currentIndex },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      playNowQueue({
        _id: video._id,
        titulo: video.titulo,
        artista: video.artista,
        numero: video.numero,
        videoUrl: video.videoUrl,
      });

      navigate("/"); // Ahora no habrá dos sonidos
      setToastMsg(`▶️ Reproduciendo "${video.titulo}" ahora`);
    } catch (err) {
      console.error(err);
      setToastMsg("❌ No se pudo reproducir la canción");
    }
  };

  let userId = null;
  let isAuthenticated = false;
  try {
    const token = getToken();
    if (token) {
      const decoded = jwtDecode(token);
      userId = decoded.userId;
      isAuthenticated = true;
    }
  } catch {
    console.warn("Usuario no autenticado");
  }

  const handleOpenModal = (songId) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesión para agregar a una playlist");
      return;
    }
    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const fetchVideos = async (usarFiltro = false) => {
    try {
      const headers = isAuthenticated
        ? { Authorization: `Bearer ${getToken()}` }
        : {};
      const url = usarFiltro ? FILTRO_URL : SONG_URL;
      const params = usarFiltro
        ? { busqueda: filtros.busqueda, ordenFecha: filtros.ordenFecha }
        : {};
      const res = await axios.get(url, { headers, params });
      setVideos(res.data.canciones || res.data);
    } catch (err) {
      console.error("Error al cargar videos", err);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (filtros.busqueda.trim() !== "") fetchVideos(true);
      else fetchVideos();
    }, 500);
    return () => clearTimeout(debounce);
  }, [filtros.busqueda, filtros.ordenFecha]);

  const agregarACola = async (songId) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesión para agregar a cola");
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/t/cola/add`,
        { userId, songId },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      const cancion = res.data.cancion || videos.find((v) => v._id === songId);

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

  return (
    <div className="p-2">
      {/* Filtro */}
      <div className="d-flex flex-wrap justify-content-center align-items-center mb-2">
        <label className="caja-buscar" htmlFor="busqueda">
          Buscar por Artista:
        </label>
        <div className="buscar-2">
          <input
            type="text"
            name="busqueda"
            value={filtros.busqueda}
            onChange={handleChange}
            className="buscar text-center text-dark bg-light"
          />
        </div>
      </div>

      {/* Listado de videos */}
      <div className="tarjetas">
        {videos.map((video) => (
          <div key={video._id} className="bg-modificado">
            <div>
              <button
                className="video-btn heart-btn"
                onClick={() => handleOpenModal(video._id)}
                title="Agregar a playlist"
                disabled={!isAuthenticated}
              >
                <img src="./heart.png" alt="" width="40px" />
              </button>

              <button
                className="video-btn list-btn"
                onClick={() => agregarACola(video._id)}
                title="Agregar a cola"
                disabled={!isAuthenticated}
              >
                <img src="./mas.png" alt="" width="40px" />
              </button>

              <button
                className="video-btn play-btn"
                onClick={() => playNow(video)}
              >
                <img src="./play.png" alt="" width="60px" />
              </button>
            </div>

            <div className="text-center text-black p-2 texto-superior">
              <span className="fw-bold">
                {video.numero} - {video.artista}
              </span>
              <br />
              <small>
                {video.titulo} - {video.generos?.nombre || "Sin género"}
              </small>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de playlists */}
      {isAuthenticated && (
        <PlaylistSelectorModal
          show={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          userId={userId}
          songId={selectedSongId}
          onAddToPlaylistSuccess
        />
      )}

      {/* Toast */}
      <ToastModal
        mensaje={toastMsg}
        onClose={() => setToastMsg("")}
        duracion={2000}
      />
    </div>
  );
}
