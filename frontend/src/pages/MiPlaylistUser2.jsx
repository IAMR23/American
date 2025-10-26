import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import useSocket from "../hooks/useSocket"; // Ahora solo accede al contexto
import "../styles/listaCanciones.css";
import Logo from "../components/Logo";
import PlaylistSelectorModal from "../components/PlaylistSelectorModal";
import { useNavigate, useParams } from "react-router-dom";
import { useQueueContext } from "../hooks/QueueProvider";
import ToastModal from "../components/modal/ToastModal";

export default function MiPlaylistUser2() {
  const [videos, setVideos] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [filtros, setFiltros] = useState({ busqueda: "", ordenFecha: "desc" });
  const [videoActual, setVideoActual] = useState(null);
  const [nombrePlaylist, setNombrePlaylist] = useState("");
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

  const { id } = useParams();

  // Autenticación segura
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

  // Abrir modal de playlist
  const handleOpenModal = (songId) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesión para agregar a una playlist");
      return;
    }
    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  // Cargar videos
  const fetchCancionesDePlaylist = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/t/playlist/canciones/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setVideos(response.data.canciones || []);
      setNombrePlaylist(response.data.nombre || ""); // 👈 aquí guardamos el nombre
    } catch (err) {
      console.error("Error al obtener canciones:", err);
    }
  };

  useEffect(() => {
    fetchCancionesDePlaylist();
  }, []);

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
    <>
      <Logo />
      <div className="p-2">
        {/* Filtro */}
        <div className="d-flex flex-wrap justify-content-center align-items-center mb-2">
          <h1 className="">Favoritos: {nombrePlaylist || "Cargando..."}</h1>
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
                  <img src="/heart.png" alt="" width="40px" />
                </button>

                <button
                  className="video-btn list-btn"
                  onClick={() => agregarACola(video._id)}
                  title="Agregar a cola"
                  disabled={!isAuthenticated}
                >
                  <img src="/mas.png" alt="" width="40px" />
                </button>

                <button
                  className="video-btn play-btn"
                  onClick={() => playNow(video)}
                >
                  <img src="/play.png" alt="" width="60px" />
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
            onAddToPlaylistSuccess={() => {
              setToastMsg("🎵 Canción agregada a la playlist");
              // Opcional: actualizar la lista de videos o la cola si quieres
            }}
          />
        )}

        <ToastModal
          mensaje={toastMsg}
          onClose={() => setToastMsg("")}
          duracion={2000}
        />
      </div>
    </>
  );
}
