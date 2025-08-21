import React, { useEffect, useState } from "react";
import axios from "axios";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import "../styles/listaCanciones.css";
import VideoPlayer2 from "./VideoPlayer2";
const SONG_URL = `${API_URL}/song/ultsubidas`;
const FILTRO_URL = `${API_URL}/song/filtrar`;

export default function UltimasSubidas({
  setCola,
  cola,
  cargarCola,
  onAgregarCancion,
  setCurrentIndex,
  setFullscreenRequested,
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
    setMostrarReproductor(false);

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
  const [mostrarReproductor, setMostrarReproductor] = useState(false);
  const [videoActual, setVideoActual] = useState(null);

  return (
    <div className="p-2">
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

      <div className="tarjetas">
        {videos.map((video) => {
          return (
            <div key={video._id} className="bg-modificado">
              <div className="">
                <button
                  className="video-btn heart-btn"
                  onClick={() => handleOpenModal(video._id)}
                  title="Agregar a playlist"
                  disabled={!isAuthenticated}
                >
                  <img src="./heart.png" alt="" width={"40px"} />
                </button>

                <button
                  className="video-btn list-btn"
                  onClick={() => agregarACola(video._id)}
                  title="Agregar a cola"
                  disabled={!isAuthenticated}
                >
                  <img src="./mas.png" alt="" width={"40px"} />
                </button>

                <button
                  className="video-btn play-btn"
                  onClick={() => {
                    setVideoActual(video);
                    setMostrarReproductor(true);
                  }}
                >
                  <img src="./play.png" alt="" width={"60px"} />
                </button>
              </div>

              <div className="">
                <div className="text-center text-black p-2 texto-superior">
                  <span className="fw-bold">
                    {video.numero} - {video.artista}
                  </span>
                  <br />
                  <small>
                    {video.titulo} - {video.generos?.nombre || "Sin género"}{" "}
                  </small>
                </div>
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

      {mostrarReproductor && (
        <div className="mini-player-flotante">
          <VideoPlayer2
            cola={[videoActual]}
            currentIndex={0}
            setCurrentIndex={() => {}}
            fullscreenRequested={true}
            onFullscreenHandled={() => {}}
          />
        </div>
      )}
    </div>
  );
}
