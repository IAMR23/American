import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import useSocket from "../hooks/useSocket"; // Ahora solo accede al contexto
import "../styles/listaCanciones.css";
import Logo from "../components/Logo";
import PlaylistSelectorModal from "../components/PlaylistSelectorModal";
import { useParams } from "react-router-dom";

const SONG_URL = `${API_URL}/song/numero`;
const FILTRO_URL = `${API_URL}/song/filtrar`;

export default function MiPlaylistUser2() {
  const [videos, setVideos] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [filtros, setFiltros] = useState({ busqueda: "", ordenFecha: "desc" });
  const [videoActual, setVideoActual] = useState(null);
  const [nombrePlaylist, setNombrePlaylist] = useState("");

  const { id } = useParams();

  // Autenticación segura
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

  // Suscribirse a eventos de la cola

  const { socket, isConnected, emitEvent, onEvent } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !onEvent) return; // ❌ espera a que onEvent exista

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

  // Abrir modal de playlist
  const handleOpenModal = (songId) => {
    if (!isAuthenticated)
      return alert("Inicia sesión para agregar a una playlist");
    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  // Manejar filtros
  const handleChange = (e) => {
    setMostrarReproductor(false);
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  // Cargar videos
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
      setNombrePlaylist(response.data.nombre || ""); // 👈 aquí guardamos el nombre
    } catch (err) {
      console.error("Error al obtener canciones:", err);
    }
  };

  useEffect(() => {
    fetchCancionesDePlaylist();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (filtros.busqueda.trim() !== "") fetchCancionesDePlaylist(true);
      else fetchCancionesDePlaylist();
    }, 500);
    return () => clearTimeout(debounce);
  }, [filtros.busqueda, filtros.ordenFecha]);

  // Agregar a favoritos
  const agregarAFavoritos = async (songId) => {
    if (!isAuthenticated) return alert("Inicia sesión para usar favoritos");
    try {
      await axios.post(
        `${API_URL}/t/favoritos/add`,
        { songId },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      alert("Canción agregada a favoritos");
    } catch (err) {
      console.error("Error al agregar a favoritos", err);
      alert("Ocurrió un error al agregar a favoritos");
    }
  };

  // Agregar a la cola

  const agregarACola = async (songId) => {
    if (!isAuthenticated) return alert("Inicia sesión para agregar a cola");

    try {
      const res = await axios.post(
        `${API_URL}/t/cola/add`,
        { userId, songId },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      console.log("✅ Respuesta del servidor:", res.data);

      if (socket && socket.connected) {
        socket.emit("actualizarCola", { userId, songId });
        alert("Canción agregada a la cola ✅");
      } else {
        alert("Canción agregada a la cola (sin sincronización en tiempo real)");
      }
    } catch (err) {
      console.error("❌ Error al agregar a cola:", err.response?.data || err);
      alert("No se pudo agregar la canción");
    }
  };

  // Agregar a playlist
  const handleAddToPlaylist = async (playlistId) => {
    if (!isAuthenticated) return;
    try {
      await axios.post(
        `${API_URL}/t/playlist/cancion`,
        { playlistId, songId: selectedSongId },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      alert("Canción agregada al playlist ✅");
      setShowPlaylistModal(false);
    } catch (err) {
      console.error("Error al agregar canción", err);
      alert("No se pudo agregar la canción ❌");
    }
  };

  return (
    <>
      <Logo />
      <div className="p-2">
        {/* Filtro */}
        <div className="d-flex flex-wrap justify-content-center align-items-center mb-2">
          <h1 className="">
            Playlist: {nombrePlaylist || "Cargando..."}
          </h1>
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
                  <img src="/heart.png" alt="" width="40px" />
                </button>

                <button
                  className="video-btn list-btn"
                  onClick={() => agregarACola(video._id)}
                  title="Agregar a cola"
                  disabled={!isAuthenticated}
                >
                  <img src="/mas.png" alt="" width="40px" />
                </button>

                <button
                  className="video-btn play-btn"
                  onClick={() => {
                    setVideoActual(video);
                  }}
                >
                  <img src="/play.png" alt="" width="60px" />
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
            onAddToPlaylistSuccess={() =>
              console.log("Canción agregada correctamente")
            }
          />
        )}
      </div>
    </>
  );
}
