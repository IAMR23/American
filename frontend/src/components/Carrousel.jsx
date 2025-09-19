import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BsHeart, BsList } from "react-icons/bs";
import { FaPlay, FaPlus } from "react-icons/fa";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import {
  dropboxUrlToRaw,
  getYoutubeThumbnail,
} from "../utils/getYoutubeThumbnail";
import { getToken } from "../utils/auth";
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

  const carouselRef = useRef(null);
  const visible = 5;
  let index = useRef(0);

  // Autenticación segura
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

  // Funciones del carrusel
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

  // Autoplay
  useEffect(() => {
    if (videos.length <= visible) return;
    const interval = setInterval(moveNext, 5000);
    return () => clearInterval(interval);
  }, [videos]);

  const handleOpenModal = (songId) => {
    if (!isAuthenticated) {
      alert("Inicia sesión para agregar a una playlist");
      return;
    }
    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  const agregarAFavoritos = async (songId) => {
    if (!isAuthenticated) return alert("Inicia sesión para usar favoritos");
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/t/favoritos/add`,
        { songId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert("Canción agregada a favoritos");
    } catch (error) {
      alert("Ocurrió un error al agregar a favoritos");
    }
  };

  const agregarACola = async (songId) => {
    if (!isAuthenticated) return alert("Inicia sesión para agregar a cola");

    try {
      if (onAgregarCancion) {
        await onAgregarCancion(songId);
      }
    } catch (error) {
      console.error("Error al agregar a cola", error);
      alert("No se pudo agregar la canción");
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    if (!isAuthenticated) return;
    const token = getToken();
    try {
      await axios.post(
        `${API_URL}/t/playlist/cancion`,
        {
          playlistId,
          songId: selectedSongId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Canción agregada al playlist ✅");
      setShowPlaylistModal(false);
    } catch (error) {
      console.error("Error al agregar canción", error);
      alert("No se pudo agregar la canción ❌");
    }
  };

  const masReproducida = async (id) => {
    await axios.post(`${API_URL}/song/${id}/reproducir`);
    // lógica para reproducir el video...
  };
  return (
    <div className="carousel-container ">
      <button className="arrow arrow-left" onClick={movePrev}>
        &#10094;
      </button>
      <button className="arrow arrow-right" onClick={moveNext}>
        &#10095;
      </button>

      <div className="carousel" ref={carouselRef}>
        {videos.map((video) => (
          <div key={video._id} className="item">
            {/* Contenedor relativo */}
            <div className="image-container">
              <img
                src={dropboxUrlToRaw(video.imagenUrl) || null}
                alt={`Miniatura de ${video.titulo}`}
                loading="lazy"
                style={{
                  width: window.innerWidth < 768 ? "400px" : "480px", // <768px es móvil
                  height: window.innerWidth < 768 ? "270px" : "288px", // mantener proporción 16:9
                  objectFit: "cover",
                  borderRadius: "12px",
                }}
              />

              {/* Botón corazón (arriba izquierda) */}
              <button
                className="btn-heart"
                onClick={() => handleOpenModal(video._id)}
                title="Agregar a favoritos"
                disabled={!isAuthenticated}
              >
                <img src="./heart.png" alt="" />
              </button>

              {/* Botón lista (arriba derecha) */}
              <button
                className="btn-list"
                onClick={() => agregarACola(video._id)}
                title="Agregar a cola"
                disabled={!isAuthenticated}
              >
                <img src="./mas.png" alt="" width={"40px"} />
              </button>

              {/* Botón play (centro) */}
              <button
                className="btn-play"
                onClick={async () => {
                  await masReproducida(video._id);
                  let index = cola.findIndex((c) => c._id === video._id);
                  if (index === -1 && onAgregarCancion) {
                    await onAgregarCancion(video._id);
                    index = cola.length;
                  }
                  if (onPlaySong && index !== -1) onPlaySong(index);
                  else alert("No se pudo reproducir la canción.");
                }}
                title="Reproducir ahora"
              >
                <img src="./play.png" alt="" />
              </button>
            </div>

            {/* Texto debajo */}
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
    </div>
  );
}
