import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import ToastModal from "./modal/ToastModal";
import { useQueueContext } from "../hooks/QueueProvider";
import "../styles/listaCanciones.css";

const SONG_SEARCH_URL = `${API_URL}/song/search`;
const PAGE_LIMIT = 20;

export default function BuscadorTablaCelular({ onSelectAll, roomId }) {
  const [filtroActivo, setFiltroActivo] = useState("numero");
  const [busqueda, setBusqueda] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [userId, setUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const { addToQueue } = useQueueContext();

  useEffect(() => {
    const token = getToken();

    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      setUserId(decoded.userId);
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  const fetchCanciones = useCallback(
    async (pageToLoad, { reset = false } = {}) => {
      if (reset && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (reset) {
        setLoadingInitial(true);
        setLoadingMore(false);
        setError("");
      } else {
        setLoadingInitial(false);
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
            filtro: filtroActivo,
          },
        });

        if (requestId !== requestIdRef.current) return;

        const nuevasCanciones = res.data.canciones || [];

        setData((prev) => {
          if (reset) return nuevasCanciones;

          const idsActuales = new Set(prev.map((cancion) => cancion._id));
          const sinRepetir = nuevasCanciones.filter(
            (cancion) => !idsActuales.has(cancion._id),
          );

          return [...prev, ...sinRepetir];
        });

        setPage(res.data.page || pageToLoad);
        setHasMore(Boolean(res.data.hasMore));
      } catch (err) {
        if (axios.isCancel?.(err) || err.name === "CanceledError") return;

        console.error("Error al obtener canciones", err);
        if (requestId === requestIdRef.current) {
          setError("No se pudieron cargar las canciones");
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingInitial(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, filtroActivo, isAuthenticated],
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      setDebouncedSearch(busqueda.trim());
    }, 500);

    return () => clearTimeout(debounce);
  }, [busqueda]);

  useEffect(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    fetchCanciones(1, { reset: true });
  }, [debouncedSearch, filtroActivo, fetchCanciones]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const cargarMasCanciones = () => {
    if (loadingInitial || loadingMore || !hasMore) return;
    fetchCanciones(page + 1);
  };

  const agregarACola = async (songId) => {
    try {
      const res = await axios.post(`${API_URL}/t/cola/add2`, {
        userId,
        songId,
        roomId,
      });

      const cancion = res.data.cancion || data.find((v) => v._id === songId);

      if (!cancion) {
        setToastMsg("No se encontro la cancion");
        return;
      }

      addToQueue({
        _id: cancion._id,
        titulo: cancion.titulo,
        artista: cancion.artista,
        numero: cancion.numero,
        videoUrl: cancion.videoUrl,
      });

      setToastMsg("Cancion agregada a la cola");
    } catch (err) {
      console.error("Error al agregar a cola:", err.response?.data || err);
      setToastMsg("No se pudo agregar la cancion");
    }
  };

  const playNow = async (video) => {
    try {
      const existingMedia = document.querySelector("audio, video");

      if (existingMedia) {
        existingMedia.pause();
        existingMedia.currentTime = 0;
      }

      await axios.post(`${API_URL}/t/cola/play-now`, {
        roomId,
        songId: video._id,
      });

      setToastMsg(`Reproduciendo "${video.titulo}" ahora`);
    } catch (err) {
      console.error(err);
      setToastMsg("No se pudo reproducir la cancion");
    }
  };

  const handleOpenModal = (songId) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesion para agregar a playlist");
      return;
    }

    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  const masReproducida = async (id) => {
    await axios.post(`${API_URL}/song/${id}/reproducir`);
  };

  return (
    <div className="p-2">
      <div className="d-flex flex-wrap justify-content-center align-items-center gap-2 mb-2">
        <div className="d-flex flex-wrap justify-content-center gap-2">
          {["numero", "artista", "titulo", "generos"].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroActivo(tipo)}
              className={`btn btn-sm ${
                filtroActivo === tipo ? "btn-danger" : "btn-primary"
              }`}
              type="button"
            >
              {tipo === "generos"
                ? "Genero"
                : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
            </button>
          ))}
        </div>

        <label className="caja-buscar mb-0" htmlFor="busqueda-sala">
          Buscar:
        </label>
        <div className="buscar-2">
          <input
            type="text"
            id="busqueda-sala"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="buscar text-center text-dark bg-light"
            placeholder={filtroActivo === "generos" ? "Genero" : filtroActivo}
          />
        </div>
      </div>

      {loadingInitial && (
        <div className="lista-loader" role="status">
          Cargando canciones...
        </div>
      )}

      {error && !loadingInitial && <div className="lista-error">{error}</div>}

      {!loadingInitial && !error && data.length === 0 && (
        <div className="lista-empty">No se encontraron canciones.</div>
      )}

      <div className="tarjetas">
        {data.map((fila) => (
          <div key={fila._id} className="bg-modificado">
            <div>
              <button
                className="video-btn heart-btn"
                onClick={() => handleOpenModal(fila._id)}
                title="Agregar a playlist"
                disabled={!isAuthenticated}
              >
                <img src="/heart.png" alt="" width="40px" />
              </button>

              <button
                className="video-btn list-btn"
                onClick={async () => {
                  await agregarACola(fila._id);
                  await masReproducida(fila._id);
                }}
                title="Agregar a cola"
              >
                <img src="/mas.png" alt="" width="40px" />
              </button>

              <button
                className="video-btn play-btn"
                onClick={async () => {
                  await masReproducida(fila._id);
                  await playNow(fila);
                  onSelectAll?.();
                }}
              >
                <img src="/play.png" alt="" width="60px" />
              </button>
            </div>

            <div className="text-center text-black p-2 texto-superior">
              <span className="fw-bold">
                {fila.numero} - {fila.artista}
              </span>
              <br />
              <small>
                {fila.titulo} - {fila.generos?.nombre || "Sin genero"}
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

      {!loadingInitial && !loadingMore && !error && data.length > 0 && (
        <div className="d-flex justify-content-center my-3">
          {hasMore ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={cargarMasCanciones}
              disabled={loadingMore}
            >
              Cargar mas
            </button>
          ) : (
            <div className="lista-end">No hay mas canciones por cargar.</div>
          )}
        </div>
      )}

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
