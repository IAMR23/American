import React, { useEffect, useState } from "react";
import axios from "axios";
import { BsHeart, BsList, BsPlug, BsPlus, BsPlusCircle } from "react-icons/bs";
import { FaPlus } from "react-icons/fa";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { getYoutubeThumbnail } from "../utils/getYoutubeThumbnail";
import { getToken } from "../utils/auth";
import "../styles/Carrousel.css";
const SONG_URL = `${API_URL}/song`;
const FILTRO_URL = `${API_URL}/song/filtrar`;

export default function GaleriaYoutube({
  setCola,
  cola,
  cargarCola,
  onAgregarCancion,
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
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
      console.error("Error al agregar a favoritos", error);
      alert("Ocurrió un error al agregar a favoritos");
    }
  };
  console.log(videos);

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

  return (
    <div className="" style={{ height: "100vh" }}>
      <div className="d-flex flex-wrap justify-content-center align-items-center mb-4">
        <input
          type="text"
          name="busqueda"
          placeholder="Buscar por título, artista"
          value={filtros.busqueda}
          onChange={handleChange}
          className="bg-dark p-3   text-center"
        />
      </div>

      <div className="d-flex flex-wrap justify-content-center gap-2">
        {videos.map((video) => {
          return (
            <div
              key={video._id}
              className=" bg-dark col-12 col-sm-6 col-md-4 col-lg-3"
              style={{
                cursor: "pointer",
                position: "relative",
                height: "100px",
                flex: "0 0 calc((100% / 6) - 8px)", // 6 tarjetas menos gap (gap-2 ~ 8px)
                maxWidth: "calc((100% / 6) - 8px)", // limita el ancho máximo
                borderRadius: "0.25rem",
                overflow: "hidden",
              }}
            >
              <div className="thumbnail-container ">
                {/* Botón Corazón (Superior Izquierdo) */}
                <button
                  className="video-btn heart-btn"
                  onClick={() => agregarAFavoritos(video._id)}
                  title="Agregar a favoritos"
                  disabled={!isAuthenticated}
                >
                  <img src="./heart.png" alt="" width={"60px"} />
                </button>

                {/* Botón Cola (Superior Derecho) */}
                <button
                  className="video-btn list-btn"
                  onClick={() => agregarACola(video._id)}
                  title="Agregar a cola"
                  disabled={!isAuthenticated}
                >
                  <img src="./mas.png" alt="" width={"60px"} />
                </button>

                {/* Botón Play (Centro) */}
                <button
                  className="video-btn play-btn"
                  onClick={() => setVideoSeleccionado(video)}
                >
                  <img src="./play.png" alt="" width={"60px"} />
                </button>
              </div>

              <div className="d-flex flex-column justify-content-center align-items-center">
                <span className="fw-bold text-light">
                  {video.numero} - {video.titulo}
                </span>
                <small className="text-light">
                  {video.artista} - {video.generos?.nombre || "Sin genero"}
                </small>

                {/* <button
                  className="btn btn-sm btn-outline-light mt-1"
                  onClick={() => handleOpenModal(video._id)}
                  title="Agregar a playlist"
                  disabled={!isAuthenticated}
                >
                  <FaPlus size={18} /> Playlist
                </button> */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal solo si está autenticado */}
      {isAuthenticated && (
        <PlaylistSelectorModal
          show={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          userId={userId}
          songId={selectedSongId}
          onAddToPlaylistSuccess={() => {
            console.log("Canción agregada correctamente");
          }}
        />
      )}
    </div>
  );
}
