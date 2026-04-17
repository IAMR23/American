import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import useSocket from "../hooks/useSocket";
import "../styles/listaCanciones.css";
import Logo from "../components/Logo";
import PlaylistSelectorModal from "../components/PlaylistSelectorModal";
import { useNavigate, useParams } from "react-router-dom";
import { useQueueContext } from "../hooks/QueueProvider";
import ToastModal from "../components/modal/ToastModal";

const FILTRO_URL = `${API_URL}/song/filtrar`;

export default function MiPlaylistUser2() {
  const [videos, setVideos] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [filtros, setFiltros] = useState({ busqueda: "", ordenFecha: "desc" });
  const [videoActual, setVideoActual] = useState(null);
  const [nombrePlaylist, setNombrePlaylist] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const navigate = useNavigate();
  const { id } = useParams();

  const { addToQueue, playNowQueue, changeSong, cola, setCola, currentIndex } =
    useQueueContext();

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

  const roomId = localStorage.getItem("roomId");

  const handleOpenModal = (songId) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesión para agregar a una playlist");
      return;
    }
    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const masReproducida = async (songId) => {
    try {
      await axios.post(`${API_URL}/song/${songId}/reproducir`);
    } catch (err) {
      console.error("Error al registrar reproducción:", err);
    }
  };

  const playNow = async (video) => {
    if (!isAuthenticated) {
      setToastMsg("⚠️ Inicia sesión para reproducir");
      return;
    }

    try {
      const token = getToken();

      const existingMedia = document.querySelector("audio, video");
      if (existingMedia) {
        existingMedia.pause();
        existingMedia.currentTime = 0;
      }

      await axios.post(
        `${API_URL}/t/cola/play-now`,
        { roomId, songId: video._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setToastMsg(`▶️ Reproduciendo "${video.titulo}" ahora`);
      navigate("/");
    } catch (err) {
      console.error(err);
      setToastMsg("❌ No se pudo reproducir la canción");
    }
  };

  const agregarACola = async (songId) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesión para agregar a cola");
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/t/cola/add`,
        { userId, songId, roomId },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      const cancion = res.data.cancion || videos.find((v) => v._id === songId);

      if (!cancion) {
        setToastMsg("No se encontró la canción");
        return;
      }

      setToastMsg("✅ Canción agregada a la cola");
    } catch (err) {
      console.error("Error al agregar a cola:", err.response?.data || err);
      setToastMsg("❌ No se pudo agregar la canción");
    }
  };

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
      setNombrePlaylist(response.data.nombre || "");
    } catch (err) {
      console.error("Error al obtener canciones:", err);
    }
  };

  const fetchCancionesFiltradas = async () => {
    try {
      const headers = isAuthenticated
        ? { Authorization: `Bearer ${getToken()}` }
        : {};

      const res = await axios.get(FILTRO_URL, {
        headers,
        params: {
          busqueda: filtros.busqueda,
          filtro: "artista",
          ordenFecha: filtros.ordenFecha,
        },
      });

      const cancionesFiltradas = res.data.canciones || res.data || [];

      const idsPlaylist = new Set(videos.map((v) => v._id));
      const filtradasDentroPlaylist = cancionesFiltradas.filter((c) =>
        idsPlaylist.has(c._id)
      );

      setVideos(filtradasDentroPlaylist);
    } catch (err) {
      console.error("Error al filtrar canciones:", err);
    }
  };

  useEffect(() => {
    fetchCancionesDePlaylist();
  }, [id]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (filtros.busqueda.trim() !== "") {
        fetchCancionesFiltradas();
      } else {
        fetchCancionesDePlaylist();
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [filtros.busqueda, filtros.ordenFecha]);

  return (
    <>
      <Logo />

      <div className="p-2">
        {/* Encabezado + filtro */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 mb-3">
          <h1 className="text-center m-0">
            Favoritos: {nombrePlaylist || "Cargando..."}
          </h1>

          <div className="d-flex flex-column flex-sm-row align-items-center gap-2">
            <label className="m-0 fw-bold" htmlFor="busqueda">
              Buscar por artista:
            </label>
            <input
              id="busqueda"
              type="text"
              name="busqueda"
              value={filtros.busqueda}
              onChange={handleChange}
              className="form-control text-center"
              placeholder="Escribe un artista"
            />
          </div>
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
                  <img src="/heart.png" alt="playlist" width="40" />
                </button>

                <button
                  className="video-btn list-btn"
                  onClick={async () => {
                    await masReproducida(video._id);
                    await agregarACola(video._id);
                  }}
                  title="Agregar a cola"
                  disabled={!isAuthenticated}
                >
                  <img src="/mas.png" alt="cola" width="40" />
                </button>

                <button
                  className="video-btn play-btn"
                  onClick={async () => {
                    await masReproducida(video._id);
                    await playNow(video);
                  }}
                >
                  <img src="/play.png" alt="play" width="60" />
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