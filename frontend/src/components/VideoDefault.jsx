import React, { useEffect, useState } from "react";
import axios from "axios";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import ToastModal from "./modal/ToastModal";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import "../styles/listaCanciones.css";
import { useQueueContext } from "../hooks/QueueProvider";
import { useNavigate } from "react-router-dom";

const SONG_URL = `${API_URL}/song/numero`;
const FILTRO_URL = `${API_URL}/song/filtrar`;

export default function VideoDefault() {
  const [videos, setVideos] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [filtros, setFiltros] = useState({ busqueda: "", ordenFecha: "desc" });
  const [videoActual, setVideoActual] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const fetchVideos = async (usarFiltro = false) => {
    try {
      const headers = isAuthenticated
        ? { Authorization: `Bearer ${getToken()}` }
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
    const debounce = setTimeout(() => {
      if (filtros.busqueda.trim() !== "") fetchVideos(true);
      else fetchVideos();
    }, 500);
    return () => clearTimeout(debounce);
  }, [filtros.busqueda, filtros.ordenFecha]);

  return (
    <div className="p-2">
      {/* 🎵 Selector de canción por defecto */}
      <div className="default-song-section text-center p-3 mb-3 bg-light rounded shadow-sm">
        <h5 className="text-primary fw-bold mb-2">
          Seleccionar canción por defecto
        </h5>
        <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap">
          <select
            className="form-select form-select-sm w-auto border-primary text-primary"
            value={videoActual || ""}
            onChange={(e) => setVideoActual(e.target.value)}
          >
            <option value="">-- Elige una canción --</option>
            {videos.map((v) => (
              <option key={v._id} value={v._id}>
                {v.numero} - {v.titulo} ({v.artista})
              </option>
            ))}
          </select>

          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              if (!videoActual) {
                setToastMsg("⚠️ Selecciona una canción primero");
                return;
              }
              try {
                await axios.post(`${API_URL}/t/video`, {
                  songId: videoActual,
                });
                setToastMsg("✅ Canción por defecto actualizada");
              } catch (err) {
                console.error(err);
                setToastMsg("❌ Error al guardar la canción por defecto");
              }
            }}
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Toast */}
      <ToastModal
        mensaje={toastMsg}
        onClose={() => setToastMsg("")}
        duracion={2000}
      />
    </div>
  );
}
