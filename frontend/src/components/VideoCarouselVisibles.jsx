import React, { useEffect, useState } from "react";
import "../styles/VideoCarousel.css";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useQueueContext } from "../hooks/QueueProvider";
import axios from "axios";
import { API_URL } from "../config";
import { dropboxUrlToRaw } from "../utils/getYoutubeThumbnail";
import { getToken } from "../utils/auth";
import ToastModal from "./modal/ToastModal";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
const SONG_URL = `${API_URL}/song/visibles`;

export default function VideoCarouselVisibles() {
  const [indice, setIndice] = useState(0);
  const [videos, setVideos] = useState([]);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const itemsPerPage = 4;
  const moveBy = 3;

  const next = () => {
    setIndice((prev) => (prev + moveBy) % videos.length);
  };

  const prev = () => {
    setIndice((prev) => (prev - moveBy + videos.length) % videos.length);
  };

  const { addToQueue, playNowQueue, cola, setCola, currentIndex } =
    useQueueContext();

  // Autenticación
  let isAuthenticated = false;
  let userId = null;
  try {
    const token = getToken();
    if (token) {
      const decoded = JSON.parse(atob(token.split(".")[1])); // jwtDecode simple
      userId = decoded.userId;
      isAuthenticated = true;
    }
  } catch {
    console.warn("Usuario no autenticado");
  }

  // Funciones
  const handleOpenModal = (songId) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesión para agregar a una playlist");
      return;
    }
    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  const masReproducida = async (id) => {
    await axios.post(`${API_URL}/song/${id}/reproducir`);
  };

  const fetchVideos = async () => {
    try {
      const headers = isAuthenticated
        ? { Authorization: `Bearer ${getToken()}` }
        : {};
      const res = await axios.get(SONG_URL, { headers });
      setVideos(res.data.canciones || res.data);
    } catch (err) {
      console.error("Error al cargar videos", err);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const agregarACola = async (songId) => {
    try {
      const roomId = localStorage.getItem("roomId");

      if (!roomId) {
        setToastMsg("❌ No hay sala activa");
        return;
      }

      let res;

      if (isAuthenticated) {
        res = await axios.post(
          `${API_URL}/t/cola/add`,
          { userId, songId, roomId }, // 🔥 AQUÍ
          { headers: { Authorization: `Bearer ${getToken()}` } },
        );
      } else {
        res = await axios.post(
          `${API_URL}/t/cola/without/aut/add`,
          { songId }, // 🔥 AQUÍ TAMBIÉN
        );
      }

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

  const playNow = async (video) => {
    if (!isAuthenticated) {
      setToastMsg("⚠️ Inicia sesión para reproducir");
      return;
    }

    const roomId = localStorage.getItem("roomId");

    try {
      const token = getToken();

      // Detener la canción anterior
      const existingMedia = document.querySelector("audio, video");
      if (existingMedia) {
        existingMedia.pause();
        existingMedia.currentTime = 0;
      }

      // Insertar en cola backend en la posición exacta
      await axios.post(
        `${API_URL}/t/cola/play-now`,
        { roomId, songId: video._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setToastMsg(`▶️ Reproduciendo "${video.titulo}" ahora`);
    } catch (err) {
      console.error(err);
      setToastMsg("❌ No se pudo reproducir la canción");
    }
  };

  return (
    <div className="carousel-container">
      <div className="carousel-content">
        <button className="arrow-btn left" onClick={prev}>
          <FaChevronLeft />
        </button>

        <div className="video-list">
          <div
            className="video-track"
            style={{
              transform: `translateX(-${indice * (100 / itemsPerPage)}%)`,
            }}
          >
            {videos.map((video) => (
              <div className="video-card" key={video._id}>
                <div className="video-thumbnail">
                  <img
                    src={dropboxUrlToRaw(video.imagenUrl) || null}
                    alt={`Miniatura de ${video.titulo}`}
                    loading="lazy"
                  />

                  <button
                    className="btn-heart"
                    onClick={() => handleOpenModal(video._id)}
                    title="Agregar a playlist"
                  >
                    <img src="./heart.png" alt="" />
                  </button>

                  <button
                    className="btn-list"
                    onClick={async () => {
                      await masReproducida(video._id);
                      agregarACola(video._id);
                    }}
                    title="Agregar a cola"
                    //  disabled={!isAuthenticated}
                  >
                    <img src="./mas.png" alt="" width={"40px"} />
                  </button>

                  <button
                    className="btn-play"
                    onClick={async () => {
                      await masReproducida(video._id);
                      await playNow(video);
                    }}
                    title="Reproducir ahora"
                  >
                    <img src="./play.png" alt="" />
                  </button>
                </div>
                <div className="d-flex flex-column justify-content-center align-items-center">
                  <span className="fw-bold text-light">{video.titulo}</span>
                  <small className="text-light">
                    {video.artista} - {video.generos?.nombre || "Sin género"}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="arrow-btn right" onClick={next}>
          <FaChevronRight />
        </button>
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
