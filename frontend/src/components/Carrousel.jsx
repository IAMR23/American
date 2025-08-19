import React, { useEffect, useState } from "react";
import axios from "axios";
import { BsHeart, BsList } from "react-icons/bs";
import { FaPlay, FaPlus } from "react-icons/fa";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { getYoutubeThumbnail } from "../utils/getYoutubeThumbnail";
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
  const [videoSeleccionado, setVideoSeleccionado] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [filtros, setFiltros] = useState({
    busqueda: "",
    ordenFecha: "desc",
  });

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
  } catch (error) {
    console.warn("Usuario no autenticado");
  }

  const handleOpenModal = (songId) => {
    if (!isAuthenticated) {
      alert("Inicia sesión para agregar a una playlist");
      return;
    }
    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  const fetchVideos = async (usarFiltro = false) => {
    try {
      const headers = isAuthenticated
        ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
        : {};

      const url = usarFiltro ? FILTRO_URL : SONG_URL;
      const params = usarFiltro
        ? { busqueda: filtros.busqueda, ordenFecha: filtros.ordenFecha }
        : {};

      const res = await axios.get(url, { headers, params });
      setVideos(res.data.canciones || res.data);
      console.log("cds", res.data);
    } catch (err) {
      console.error("Error al cargar videos", err);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (filtros.busqueda.trim() !== "") {
        fetchVideos(true);
      } else {
        fetchVideos();
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [filtros.busqueda, filtros.ordenFecha]);

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

  function dropboxUrlToRaw(url) {
    try {
      const urlObj = new URL(url);
      // Verificamos si es URL de Dropbox
      if (urlObj.hostname.includes("dropbox.com")) {
        if (urlObj.searchParams.has("dl")) {
          urlObj.searchParams.delete("dl");
        }
        urlObj.searchParams.set("raw", "1");
        return urlObj.toString();
      } else {
        // No es Dropbox, devolvemos la URL normal
        return url;
      }
    } catch (error) {
      // Si no es URL válida, devolver original para evitar error
      return url;
    }
  }

  return (
    <div>
      <div className="bg-dark">
        <div
          id="videoCarousel"
          className="carousel slide"
          data-bs-ride="carousel"
        >
          <div className="carousel-inner">
            {Array.from({ length: Math.ceil(videos.length / 5) }).map(
              (_, groupIndex) => {
                const videosDelGrupo = videos.slice(
                  groupIndex * 5,
                  (groupIndex + 1) * 5
                );
                const placeholders = 5 - videosDelGrupo.length;

                return (
                  <div
                    key={groupIndex}
                    className={`carousel-item ${
                      groupIndex === 0 ? "active" : ""
                    }`}
                  >
                    <div
                      className="row mx-0"
                      style={{
                        display: "flex",
                        gap: "15px", // espacio entre videos
                        justifyContent: "center",
                      }}
                    >
                      {videosDelGrupo.map((video) => (
                        <div
                          key={video._id}
                          className="video-card"
                          style={{
                            flex: "0 0 18%",
                            maxWidth: "18%",
                            cursor: "pointer",
                            position: "relative",
                          }}
                        >
                          <img
                            src={dropboxUrlToRaw(video.imagenUrl)}
                            alt={`Miniatura de ${video.titulo}`}
                            className="img-fluid rounded"
                            onClick={() => setVideoSeleccionado(video)}
                            style={{
                              width: "100%",
                              height: "290px", // más alto = más rectangular
                              objectFit: "cover",
                              borderRadius: "8px",
                            }}
                          />

                          {/* Botones */}
                          <button
                            className="video-btn heart-btn"
                            onClick={() => agregarAFavoritos(video._id)}
                            title="Agregar a favoritos"
                            disabled={!isAuthenticated}
                          >
                            <BsHeart size={20} />
                          </button>
                          <button
                            className="video-btn list-btn"
                            onClick={() => agregarACola(video._id)}
                            title="Agregar a cola"
                            disabled={!isAuthenticated}
                          >
                            <BsList size={20} />
                          </button>
                          <button
                            className="video-btn heart-btn"
                            onClick={() => handleOpenModal(video._id)}
                            title="Agregar a playlist"
                            disabled={!isAuthenticated}
                          >
                            <BsHeart size={18} />
                          </button>
                          <button
                            className="video-btn play-btn"
                            onClick={async () => {
                              await masReproducida(video._id);
                              let index = cola.findIndex(
                                (c) => c._id === video._id
                              );
                              if (index === -1 && onAgregarCancion) {
                                await onAgregarCancion(video._id);
                                index = cola.length;
                              }
                              if (onPlaySong && index !== -1) onPlaySong(index);
                              else alert("No se pudo reproducir la canción.");
                            }}
                            title="Reproducir ahora"
                          >
                            <FaPlay size={24} />
                          </button>

                          <div className="d-flex flex-column mt-2">
                            <span className="fw-bold text-light">
                              {video.titulo}
                            </span>
                            <small className="text-light">
                              {video.artista} -{" "}
                              {video.generos?.nombre || "Sin género"}
                            </small>
                          </div>
                        </div>
                      ))}

                      {/* Placeholders invisibles */}
                      {Array.from({ length: placeholders }).map((_, i) => (
                        <div
                          key={`placeholder-${i}`}
                          style={{
                            flex: "0 0 18%",
                            maxWidth: "18%",
                            visibility: "hidden",
                            height: "300px",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {videos.length > 5 && (
            <>
              <button
                className="carousel-control-prev"
                type="button"
                data-bs-target="#videoCarousel"
                data-bs-slide="prev"
              >
                <span
                  className="carousel-control-prev-icon"
                  aria-hidden="true"
                ></span>
                <span className="visually-hidden">Previous</span>
              </button>
              <button
                className="carousel-control-next"
                type="button"
                data-bs-target="#videoCarousel"
                data-bs-slide="next"
              >
                <span
                  className="carousel-control-next-icon"
                  aria-hidden="true"
                ></span>
                <span className="visually-hidden">Next</span>
              </button>
            </>
          )}
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
    </div>
  );
}
