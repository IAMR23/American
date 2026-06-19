import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import { jwtDecode } from "jwt-decode";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import ToastModal from "./modal/ToastModal";
import { useQueueContext } from "../hooks/QueueProvider";

const SONG_SEARCH_URL = `${API_URL}/song/search`;
const PAGE_LIMIT = 30;

export default function BuscadorTabla({ onSelectAll, roomId }) {
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

  const scrollContainerRef = useRef(null);
  const observerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);

  const { addToQueue } = useQueueContext();

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.userId);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    }
  }, []);

  const fetchCanciones = useCallback(
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
            filtro: filtroActivo,
          },
        });

        if (requestId !== requestIdRef.current) return;

        const nuevasCanciones = res.data.canciones || [];

        setData((prev) => {
          if (reset) return nuevasCanciones;

          const idsActuales = new Set(prev.map((cancion) => cancion._id));
          const cancionesSinRepetir = nuevasCanciones.filter(
            (cancion) => !idsActuales.has(cancion._id),
          );

          return [...prev, ...cancionesSinRepetir];
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
          loadingRef.current = false;
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
    scrollContainerRef.current?.scrollTo({ top: 0 });
    fetchCanciones(1, { reset: true });
  }, [debouncedSearch, filtroActivo, fetchCanciones]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      observerRef.current?.disconnect();
    };
  }, []);

  const lastRowRef = useCallback(
    (node) => {
      if (loadingInitial || loadingMore) return;
      observerRef.current?.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
            fetchCanciones(page + 1);
          }
        },
        { root: scrollContainerRef.current, rootMargin: "120px" },
      );

      if (node) observerRef.current.observe(node);
    },
    [fetchCanciones, hasMore, loadingInitial, loadingMore, page],
  );

  const agregarACola = async (songId, cancionSeleccionada = null) => {
    try {
      let res;
      const activeRoomId = roomId || localStorage.getItem("roomId");

      if (isAuthenticated) {
        res = await axios.post(
          `${API_URL}/t/cola/add`,
          { userId, songId, roomId: activeRoomId },
          { headers: { Authorization: `Bearer ${getToken()}` } },
        );
      } else {
        res = await axios.post(`${API_URL}/t/cola/without/aut/add`, {
          songId,
        });
      }

      const cancion =
        res.data.cancion ||
        cancionSeleccionada ||
        data.find((v) => v._id === songId);

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
      return cancion;
    } catch (err) {
      console.error("Error al agregar a cola:", err.response?.data || err);
      setToastMsg("No se pudo agregar la cancion");
      return null;
    }
  };

  const playNow = async (video) => {
    if (!isAuthenticated) {
      setToastMsg("Inicia sesion para reproducir");
      return;
    }

    const activeRoomId = roomId || localStorage.getItem("roomId");

    try {
      const token = getToken();
      const existingMedia = document.querySelector("audio, video");

      if (existingMedia) {
        existingMedia.pause();
        existingMedia.currentTime = 0;
      }

      await axios.post(
        `${API_URL}/t/cola/play-now`,
        { roomId: activeRoomId, songId: video._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

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

  const buscarCancionExactaPorNumero = async (numero) => {
    const cancionCargada = data.find(
      (cancion) => Number(cancion.numero) === Number(numero),
    );

    if (cancionCargada) return cancionCargada;

    const headers = isAuthenticated
      ? { Authorization: `Bearer ${getToken()}` }
      : {};

    const res = await axios.get(SONG_SEARCH_URL, {
      headers,
      params: {
        page: 1,
        limit: 100,
        search: String(numero),
        filtro: "numero",
      },
    });

    return (res.data.canciones || []).find(
      (cancion) => Number(cancion.numero) === Number(numero),
    );
  };

  const handleBusquedaKeyDown = async (e) => {
    if (e.key !== "Enter") return;
    if (filtroActivo !== "numero") return;

    e.preventDefault();

    const numero = busqueda.trim();
    if (!numero) return;

    try {
      const cancion = await buscarCancionExactaPorNumero(numero);

      if (!cancion?._id) {
        setToastMsg(`No se encontro la cancion numero ${numero}`);
        return;
      }

      const cancionAgregada = await agregarACola(cancion._id, cancion);

      if (!cancionAgregada) return;

      setToastMsg(
        `Agregada a la cola: ${cancionAgregada.numero} - ${cancionAgregada.artista} - ${cancionAgregada.titulo}`,
      );
      setBusqueda("");
      setDebouncedSearch("");
    } catch (err) {
      console.error("Error al agregar por numero:", err);
      setToastMsg("No se pudo agregar la cancion por numero");
    }
  };

  return (
    <div className="p-2">
      <div className="d-flex align-items-center flex-wrap mb-3">
        {["numero", "artista", "titulo", "generos"].map((tipo) => (
          <button
            key={tipo}
            onClick={() => setFiltroActivo(tipo)}
            className={`btn me-2 ${
              filtroActivo === tipo ? "btn-danger" : "btn-primary"
            }`}
          >
            {tipo === "generos"
              ? "Genero"
              : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
        <input
          type="text"
          className="form-control ms-2"
          style={{ width: "auto" }}
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={handleBusquedaKeyDown}
        />
      </div>

      {loadingInitial && (
        <div className="alert alert-info py-2 text-center" role="status">
          Cargando canciones...
        </div>
      )}

      {error && !loadingInitial && (
        <div className="alert alert-danger py-2 text-center">{error}</div>
      )}

      {!loadingInitial && !error && data.length === 0 && (
        <div className="alert alert-light py-2 text-center">
          No se encontraron canciones.
        </div>
      )}

      <div
        ref={scrollContainerRef}
        style={{ maxHeight: "600px", overflowY: "auto" }}
      >
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Numero</th>
              <th>Cantante</th>
              <th>Cancion</th>
              <th>Genero</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {data.map((fila, index) => (
              <tr
                key={fila._id}
                ref={index === data.length - 1 ? lastRowRef : null}
              >
                <td>{fila.numero}</td>
                <td>{fila.artista}</td>
                <td>{fila.titulo}</td>
                <td>{fila.generos?.nombre || "Sin genero"}</td>
                <td>
                  <div className="d-flex justify-content-center align-items-center gap-2">
                    <button
                      className="btn btn-success btn-sm p-1 d-flex justify-content-center align-items-center"
                      onClick={async () => {
                        await masReproducida(fila._id);
                        await playNow(fila);
                        onSelectAll?.();
                      }}
                    >
                      <img src="./play.png" alt="play" width="40" />
                    </button>

                    <button
                      className="btn btn-info btn-sm p-1 d-flex justify-content-center align-items-center"
                      onClick={async () => {
                        await agregarACola(fila._id);
                        await masReproducida(fila._id);
                      }}
                    >
                      <img src="./mas.png" alt="add" width="40" />
                    </button>

                    <button
                      className="btn btn-danger btn-sm p-1 d-flex justify-content-center align-items-center"
                      onClick={() => handleOpenModal(fila._id)}
                    >
                      <img src="./heart.png" alt="fav" width="40" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loadingMore && (
          <div className="alert alert-info py-2 text-center" role="status">
            Cargando mas canciones...
          </div>
        )}

        {!hasMore && data.length > 0 && (
          <div className="alert alert-light py-2 text-center mb-0">
            No hay mas canciones por cargar.
          </div>
        )}
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
