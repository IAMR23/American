import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import ToastModal from "./modal/ToastModal";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { dropboxUrlToRaw } from "../utils/getYoutubeThumbnail";
import { getToken } from "../utils/auth";
import useSocket from "../hooks/useSocket";
import "../styles/Carrousel.css";

const SONG_URL = `${API_URL}/song/visibles`;
const FILTRO_URL = `${API_URL}/song/filtrar`;

export default function Carrousel({
  setCola,
  cola,
  cargarCola,
  onAgregarCancion,
  onPlaySong,
}) {
  const [videos, setVideos] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const carouselRef = useRef(null);
  const visible = 5;
  let index = useRef(0);

  // Autenticación
  let userId = null;
  let isAuthenticated = false;
  try {
    const token = getToken();
    if (token && typeof token === "string") {
      const decoded = jwtDecode(token);
      userId = decoded.userId;
      isAuthenticated = true;
    }
  } catch {
    console.warn("Usuario no autenticado");
  }

  // Socket
  const { socket, isConnected, onEvent } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !onEvent) return;

    const unsubscribeCola = onEvent("colaActualizada", (data) => {
      console.log("📥 Cola actualizada:", data);
    });

    const unsubscribeCambiar = onEvent("cambiarCancionCliente", (index) => {
      console.log("🎵 Cambiar canción a índice:", index);
    });

    const unsubscribeAgregada = onEvent("cancionAgregada", (data) => {
      console.log("✅ Canción agregada confirmada:", data);
    });

    return () => {
      unsubscribeCola();
      unsubscribeCambiar();
      unsubscribeAgregada();
    };
  }, [socket, isConnected, onEvent]);

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

  const agregarAFavoritos = async (songId) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesión para usar favoritos");
      return;
    }
    try {
      await axios.post(
        `${API_URL}/t/favoritos/add`,
        { songId },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setToastMsg("Canción agregada a favoritos");
    } catch (err) {
      console.error("Error al agregar a favoritos", err);
      setToastMsg("Error al agregar a favoritos");
    }
  };

  const agregarACola = async (songId) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesión para agregar a cola");
      return;
    }

    try {
      if (onAgregarCancion) {
        await onAgregarCancion(songId);

        if (socket && socket.connected) {
          socket.emit("actualizarCola", { userId, songId });
          setToastMsg("Canción agregada a la cola ✅");
        } else {
          setToastMsg(
            "Canción agregada a la cola (sin sincronización en tiempo real)"
          );
        }
      }
    } catch (err) {
      console.error("Error al agregar a cola", err);
      setToastMsg("No se pudo agregar la canción");
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    if (!isAuthenticated) return;
    try {
      await axios.post(
        `${API_URL}/t/playlist/cancion`,
        { playlistId, songId: selectedSongId },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setToastMsg("Canción agregada al playlist ✅");
      setShowPlaylistModal(false);
    } catch (err) {
      console.error("Error al agregar canción", err);
      setToastMsg("No se pudo agregar la canción ❌");
    }
  };

  const masReproducida = async (id) => {
    await axios.post(`${API_URL}/song/${id}/reproducir`);
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
                  let indexSong = cola.findIndex((c) => c._id === video._id);
                  if (indexSong === -1 && onAgregarCancion) {
                    await onAgregarCancion(video._id);
                    indexSong = cola.length;
                  }
                  if (onPlaySong && indexSong !== -1) onPlaySong(indexSong);
                  else setToastMsg("No se pudo reproducir la canción.");
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
          onAddToPlaylistSuccess={() => {}}
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
