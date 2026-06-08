import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import ToastModal from "./modal/ToastModal";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import "../styles/listaCanciones.css";
import { useNavigate } from "react-router-dom";

const SONG_SEARCH_URL = `${API_URL}/song/search`;
const PAGE_LIMIT = 30;
const FULLSCREEN_REQUEST_KEY = "openPlayerFullscreen";

export default function Canciones() {
  const [videos, setVideos] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [filtros, setFiltros] = useState({ busqueda: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const observerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);

  const navigate = useNavigate();

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

  const fetchVideos = useCallback(
    async (pageToLoad, { reset = false } = {}) => {
      if (reset && abortControllerRef.current) {
        abortControllerRef.current.abort();
        loadingRef.current = false;
      }

      if (loadingRef.current) return;

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      loadingRef.current = true;

      if (reset) {
        setLoadingInitial(true);
        setError("");
      } else {
        setLoadingMore(true);
      }

      try {
        const headers = isAuthenticated
          ? { Authorization: `Bearer ${getToken()}` }
          : {};

        const res = await axios.get(SONG_SEARCH_URL, {
          headers,
          signal: controller.signal,
          params: {
            page: pageToLoad,
            limit: PAGE_LIMIT,
            search: debouncedSearch,
            filtro: "artista",
          },
        });

        if (requestId !== requestIdRef.current) return;

        const nuevasCanciones = res.data.canciones || [];

        setVideos((prev) => {
          if (reset) return nuevasCanciones;

          const idsActuales = new Set(prev.map((video) => video._id));
          const cancionesSinRepetir = nuevasCanciones.filter(
            (video) => !idsActuales.has(video._id),
          );

          return [...prev, ...cancionesSinRepetir];
        });

        setPage(res.data.page || pageToLoad);
        setHasMore(Boolean(res.data.hasMore));
      } catch (err) {
        if (axios.isCancel?.(err) || err.name === "CanceledError") return;

        console.error("Error al cargar videos", err);
        if (requestId === requestIdRef.current) {
          setError("No se pudieron cargar las canciones");
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingInitial(false);
          setLoadingMore(false);
          loadingRef.current = false;
        }
      }
    },
    [debouncedSearch, isAuthenticated],
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      setDebouncedSearch(filtros.busqueda.trim());
    }, 500);

    return () => clearTimeout(debounce);
  }, [filtros.busqueda]);

  useEffect(() => {
    setVideos([]);
    setPage(1);
    setHasMore(true);
    fetchVideos(1, { reset: true });
  }, [debouncedSearch, fetchVideos]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      observerRef.current?.disconnect();
    };
  }, []);

  const lastVideoRef = useCallback(
    (node) => {
      if (loadingInitial || loadingMore) return;
      observerRef.current?.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchVideos(page + 1);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [fetchVideos, hasMore, loadingInitial, loadingMore, page],
  );

  const handleOpenModal = (songId) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesion para agregar a una playlist");
      return;
    }

    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const playNow = async (video) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesion para reproducir");
      return;
    }

    const roomId = localStorage.getItem("roomId");

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
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setToastMsg(`Reproduciendo "${video.titulo}" ahora`);
      navigate("/");
    } catch (err) {
      console.error(err);
      setToastMsg("No se pudo reproducir la cancion");
    }
  };

  const requestPlayerFullscreenOnHome = async () => {
    sessionStorage.setItem(FULLSCREEN_REQUEST_KEY, "1");

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      }
    } catch (err) {
      console.warn("No se pudo activar pantalla completa:", err);
    }
  };

  const agregarACola = async (songId) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesion para agregar a cola");
      return;
    }

    const roomId = localStorage.getItem("roomId");

    try {
      const res = await axios.post(
        `${API_URL}/t/cola/add`,
        { userId, songId, roomId },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      const cancion = res.data.cancion || videos.find((v) => v._id === songId);

      if (!cancion) {
        setToastMsg("No se encontro la cancion");
        return;
      }

      setToastMsg("Cancion agregada a la cola");
    } catch (err) {
      console.error("Error al agregar a cola:", err.response?.data || err);
      setToastMsg("No se pudo agregar la cancion");
    }
  };

  const masReproducida = async (id) => {
    await axios.post(`${API_URL}/song/${id}/reproducir`);
  };

  return (
    <div className="p-2">
      <div className="d-flex flex-wrap justify-content-center align-items-center mb-2">
        <label className="caja-buscar" htmlFor="busqueda">
          Buscar por Artista:
        </label>
        <div className="buscar-2">
          <input
            type="text"
            id="busqueda"
            name="busqueda"
            value={filtros.busqueda}
            onChange={handleChange}
            className="buscar text-center text-dark bg-light"
          />
        </div>
      </div>

      {loadingInitial && (
        <div className="lista-loader" role="status">
          Cargando canciones...
        </div>
      )}

      {error && !loadingInitial && <div className="lista-error">{error}</div>}

      {!loadingInitial && !error && videos.length === 0 && (
        <div className="lista-empty">No se encontraron canciones.</div>
      )}

      <div className="tarjetas">
        {videos.map((video, index) => (
          <div
            key={video._id}
            className="bg-modificado"
            ref={index === videos.length - 1 ? lastVideoRef : null}
          >
            <div>
              <button
                className="video-btn heart-btn"
                onClick={() => handleOpenModal(video._id)}
                title="Agregar a playlist"
                disabled={!isAuthenticated}
              >
                <img src="./heart.png" alt="" width="40px" />
              </button>

              <button
                className="video-btn list-btn"
                onClick={async () => {
                  await masReproducida(video._id);
                  agregarACola(video._id);
                }}
                title="Agregar a cola"
                disabled={!isAuthenticated}
              >
                <img src="./mas.png" alt="" width="40px" />
              </button>

              <button
                className="video-btn play-btn"
                onClick={async () => {
                  await requestPlayerFullscreenOnHome();
                  await masReproducida(video._id);
                  await playNow(video);
                }}
              >
                <img src="./play.png" alt="" width="60px" />
              </button>
            </div>

            <div className="text-center text-black p-2 texto-superior">
              <span className="fw-bold">
                {video.numero} - {video.artista}
              </span>
              <br />
              <small>
                {video.titulo} - {video.generos?.nombre || "Sin genero"}
              </small>
            </div>
          </div>
        ))}
      </div>

      {loadingMore && (
        <div className="lista-loader" role="status">
          Cargando mas canciones...
        </div>
      )}

      {!hasMore && videos.length > 0 && (
        <div className="lista-end">No hay mas canciones por cargar.</div>
      )}

      {isAuthenticated && (
        <PlaylistSelectorModal
          show={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          userId={userId}
          songId={selectedSongId}
          onAddToPlaylistSuccess={() => {
            setToastMsg("Cancion agregada a la playlist");
          }}
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
