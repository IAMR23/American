import React, { useEffect, useState } from "react";
import axios from "axios";
import { BsHeart, BsList } from "react-icons/bs";
import { FaPlus } from "react-icons/fa";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config"
import { getYoutubeThumbnail } from "../utils/getYoutubeThumbnail";
import { getToken } from "../utils/auth";
const SONG_URL = `${API_URL}/song`;
const FILTRO_URL = `${API_URL}/song/filtrar`;


export default function BuscadorCanciones({
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
    <div className="w-full flex justify-center">
      <div className="w-full max-w-5xl p-3">
        <div className="flex flex-wrap items-end mb-4">
          <input
            type="text"
            name="busqueda"
            placeholder="Buscar por título, artista o género"
            value={filtros.busqueda}
            onChange={handleChange}
            className="p-2 m-2 border rounded w-full md:w-64"
          />
        </div>

        <table className="table table-dark table-hover">
          <thead>
            <tr>
              <th>Título</th>
              <th>Artista</th>
              <th>Géneros</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => {
              const thumbnail = getYoutubeThumbnail(video.videoUrl);
              return (
                <tr key={video._id} style={{ verticalAlign: "middle" }}>
                  <td className="fw-bold text-light">{video.titulo}</td>
                  <td className="text-light">{video.artista}</td>
                  <td className="text-light">
                    {(video.generos || []).map((g) => g.nombre).join(", ")}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => agregarAFavoritos(video._id)}
                        title="Agregar a favoritos"
                        disabled={!isAuthenticated}
                      >
                        <BsHeart size={18} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => agregarACola(video._id)}
                        title="Agregar a cola"
                        disabled={!isAuthenticated}
                      >
                        <BsList size={18} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={() => handleOpenModal(video._id)}
                        title="Agregar a playlist"
                        disabled={!isAuthenticated}
                      >
                        <FaPlus size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

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
    </div>
  );
}
