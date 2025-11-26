import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import ToastModal from "./modal/ToastModal";
import { API_URL } from "../config";
import { dropboxUrlToRaw } from "../utils/getYoutubeThumbnail";
import { getToken } from "../utils/auth";
import { useQueueContext } from "../hooks/QueueProvider";
import { useNavigate } from "react-router-dom";

const SONG_URL = `${API_URL}/song/visibles`;

export default function Carrousel() {
  const [videos, setVideos] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const carouselRef = useRef(null);
  const visible = 5;
  const index = useRef(0);

  const navigate = useNavigate();

  // Queue context
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

  // Fetch videos
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

  // Carrusel
  const updateCarousel = () => {
    if (!carouselRef.current) return;
    const offset = -(index.current * (100 / visible));
    carouselRef.current.style.transform = `translateX(${offset}%)`;
  };

  const moveNext = () => {
    index.current++;
    if (index.current > videos.length - visible) index.current = 0;
    updateCarousel();
  };

  const movePrev = () => {
    index.current--;
    if (index.current < 0) index.current = videos.length - visible;
    updateCarousel();
  };

  useEffect(() => {
    if (videos.length <= visible) return;
    const interval = setInterval(moveNext, 5000);
    return () => clearInterval(interval);
  }, [videos]);

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

  const agregarACola = async (songId) => {
    try {
      let res;
      if (isAuthenticated) {
        // 🔐 Usuario autenticado
        res = await axios.post(
          `${API_URL}/t/cola/add`,
          { userId, songId },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
      } else {
        // 👥 Usuario no autenticado (cola temporal/global)
        res = await axios.post(`${API_URL}/t/cola/without/aut/add`, { songId });
      }

      const cancion = res.data.cancion || videos.find((v) => v._id === songId);
      if (!cancion) {
        setToastMsg("No se encontró la canción");
        return;
      }

      // Evitar duplicados
      if (!cola.some((c) => c._id === cancion._id)) {
        addToQueue({
          _id: cancion._id,
          titulo: cancion.titulo,
          artista: cancion.artista,
          numero: cancion.numero,
          videoUrl: cancion.videoUrl,
        });
      }

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
        `${API_URL}/t/cola/add`,
        { userId, songId: video._id, position: currentIndex },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Insertar en cola frontend exactamente en currentIndex
      playNowQueue({
        _id: video._id,
        titulo: video.titulo,
        artista: video.artista,
        numero: video.numero,
        videoUrl: video.videoUrl,
      });

      setToastMsg(`▶️ Reproduciendo "${video.titulo}" ahora`);
    } catch (err) {
      console.error(err);
      setToastMsg("❌ No se pudo reproducir la canción");
    }
  };

  return (
    <div className="carousel-container">
      <button className="arrow arrow-left" onClick={movePrev}>
        &#10094;
      </button>
      <button className="arrow arrow-right" onClick={moveNext}>
        &#10095;
      </button>

      <div className="carousel" ref={carouselRef}>
        {videos.map((video) => (
          <div key={video._id} className="item">
            <div className="image-container">
              <img
                src={dropboxUrlToRaw(video.imagenUrl) || null}
                alt={`Miniatura de ${video.titulo}`}
                loading="lazy"
                style={{
                  width: window.innerWidth < 768 ? "400px" : "480px",
                  height: window.innerWidth < 768 ? "270px" : "288px",
                  objectFit: "cover",
                  borderRadius: "12px",
                }}
              />

              <button
                className="btn-heart"
                onClick={() => handleOpenModal(video._id)}
                title="Agregar a playlist"
                disabled={!isAuthenticated}
              >
                <img src="./heart.png" alt="" />
              </button>

              <button
                className="btn-list"
                onClick={() => agregarACola(video._id)}
                title="Agregar a cola"
                disabled={!isAuthenticated}
              >
                <img src="./mas.png" alt="" width={"40px"} />
              </button>

              <button
                className="btn-play"
                onClick={async () => {
                  await masReproducida(video._id);
                  playNow(video);
                }}
                title="Reproducir ahora"
              >
                <img src="./play.png" alt="" />
              </button>
            </div>

            <span className="fw-bold text-light">{video.titulo}</span>
            <small className="text-light">
              {video.artista} - {video.generos?.nombre || "Sin género"}
            </small>
          </div>
        ))}
      </div>

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
  );
}
