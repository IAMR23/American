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
const SONG_URL = `${API_URL}/song/masreproducidas`;
const LIMITE_COLA_LOCAL = 6;
const MENSAJE_LIMITE_COLA_LOCAL =
  "Solo se puede agregar maximo 6 canciones. Suscribete para agregar mas canciones !!!";

export default function VideoCarousel({
  accionesDeshabilitadas = false,
  onPlaySolo,
  onFirstQueueSongAdded,
  tieneAccesoKaraoke = false,
}) {
  const [indice, setIndice] = useState(0);
  const [videos, setVideos] = useState([]);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const itemsPerPage = 4;
  const moveBy = 3;

  const [toastMsg, setToastMsg] = useState("");

  const next = () => {
    if (!videos.length) return;
    setIndice((prev) => (prev + moveBy) % videos.length);
  };

  const prev = () => {
    if (!videos.length) return;
    setIndice((prev) => (prev - moveBy + videos.length) % videos.length);
  };

  const { addToQueue, cola, setCola, setCurrentIndex } =
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

  const registrarReproduccion = (id) => {
    masReproducida(id).catch((err) => {
      console.warn("No se pudo registrar la reproduccion:", err.response?.data || err);
    });
  };

  const normalizarCancion = (cancion) => ({
    _id: cancion._id,
    titulo: cancion.titulo,
    artista: cancion.artista,
    numero: cancion.numero,
    videoUrl: cancion.videoUrl,
  });

  const agregarAColaLocal = (cancion, reproducirAhora = false) => {
    const cancionNormalizada = normalizarCancion(cancion);
    const colaActual = Array.isArray(cola) ? cola : [];
    const colaSinDuplicado = colaActual.filter(
      (item) => String(item?._id) !== String(cancionNormalizada._id),
    );

    if (
      !tieneAccesoKaraoke &&
      !reproducirAhora &&
      colaSinDuplicado.length >= LIMITE_COLA_LOCAL
    ) {
      return null;
    }

    if (reproducirAhora) {
      setCurrentIndex?.(0);
      setCola([cancionNormalizada, ...colaSinDuplicado].slice(0, LIMITE_COLA_LOCAL));
      return 0;
    }

    if (!colaSinDuplicado.length) {
      setCurrentIndex?.(0);
    }

    setCola([...colaSinDuplicado, cancionNormalizada]);
    return colaSinDuplicado.length;
  };

  const fetchVideos = async () => {
    try {
      const headers = isAuthenticated
        ? { Authorization: `Bearer ${getToken()}` }
        : {};
      const res = await axios.get(SONG_URL, { headers });
      const payload = res.data;
      const data = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.canciones)
          ? payload.canciones
          : [];

      setVideos(data);
      setIndice(0);
    } catch (err) {
      console.error("Error al cargar videos", err);
      setVideos([]);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);


    const agregarACola = async (songId) => {
    try {
      const roomId = localStorage.getItem("roomId");
      const cancionLocal = videos.find((v) => v._id === songId);
      const colaEstabaVacia = !Array.isArray(cola) || cola.length === 0;

      if (!tieneAccesoKaraoke || !isAuthenticated || !roomId) {
        if (cancionLocal) {
          const indexAgregado = agregarAColaLocal(cancionLocal);

          if (indexAgregado == null) {
            setToastMsg(MENSAJE_LIMITE_COLA_LOCAL);
            return;
          }

          if (colaEstabaVacia) {
            onFirstQueueSongAdded?.();
          }

          setToastMsg("✅ Canción agregada a la cola");
          return;
        }

        setToastMsg("No se encontró la canción");
        return;
      }

      let res;

      if (isAuthenticated) {
        res = await axios.post(
          `${API_URL}/t/cola/add`,
          { songId, roomId },
          { headers: { Authorization: `Bearer ${getToken()}` } },
        );
      } else {
        res = await axios.post(
          `${API_URL}/t/cola/without/aut/add`,
          { songId }, // 🔥 AQUÍ TAMBIÉN
        );
      }

      const cancion = res.data.cancion || cancionLocal;

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

      if (colaEstabaVacia) {
        onFirstQueueSongAdded?.();
      }

      setToastMsg("✅ Canción agregada a la cola");
    } catch (err) {
      console.error("Error al agregar a cola:", err.response?.data || err);
      const cancionLocal = videos.find((v) => v._id === songId);
      if (cancionLocal && err.response?.status === 403) {
        const indexAgregado = agregarAColaLocal(cancionLocal);

        if (indexAgregado == null) {
          setToastMsg(MENSAJE_LIMITE_COLA_LOCAL);
          return;
        }

        if (!Array.isArray(cola) || cola.length === 0) {
          onFirstQueueSongAdded?.();
        }

        setToastMsg("✅ Canción agregada a la cola");
        return;
      }
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

      if (roomId) {
        await axios.post(
          `${API_URL}/t/cola/play-now`,
          { roomId, songId: video._id },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        agregarAColaLocal(video, true);
      }

      setToastMsg(`▶️ Reproduciendo "${video.titulo}" ahora`);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        agregarAColaLocal(video, true);
        setToastMsg(`▶️ Reproduciendo "${video.titulo}" ahora`);
        return;
      }
      setToastMsg("❌ No se pudo reproducir la canción");
    }
  };


  return (
    <div className="carousel-container">
      <div className="carousel-content">
        <button
          className="arrow-btn left"
          onClick={prev}
          disabled={accionesDeshabilitadas || !videos.length}
        >
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
                    className="w-full h-full object-contain"
                  />

                  <button
                    className="btn-heart"
                    onClick={() => handleOpenModal(video._id)}
                    title="Agregar a playlist"
                    disabled={accionesDeshabilitadas || !isAuthenticated}
                  >
                    <img src="./heart.png" alt="" />
                  </button>

                  <button
                    className="btn-list"
                    onClick={() => {
                      registrarReproduccion(video._id);
                      agregarACola(video._id);
                    }}
                    title="Agregar a cola"
                    disabled={accionesDeshabilitadas}
                  >
                    <img src="./mas.png" alt="" width={"40px"} />
                  </button>

                  <button
                    className="btn-play"
                    onClick={() => {
                      onPlaySolo?.();
                      registrarReproduccion(video._id);
                      playNow(video);
                    }}
                    title="Reproducir ahora"
                    disabled={accionesDeshabilitadas || !isAuthenticated}
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

        <button
          className="arrow-btn right"
          onClick={next}
          disabled={accionesDeshabilitadas || !videos.length}
        >
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
