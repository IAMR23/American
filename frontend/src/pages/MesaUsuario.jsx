import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { API_URL } from "../config";
import { useSocketContext } from "../hooks/SocketContext";
import ToastModal from "../components/modal/ToastModal";
import "../styles/listaCanciones.css";

const SONG_SEARCH_URL = `${API_URL}/song/search`;
const PAGE_LIMIT = 20;

const getPersonas = (mesa) => mesa?.personas || mesa?.participantes || [];

export default function MesaUsuario() {
  const { roomId } = useParams();
  const { connectSocket, isConnected, socket, onEvent } = useSocketContext();
  const [mesas, setMesas] = useState([]);
  const [mesaId, setMesaId] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [nombrePersona, setNombrePersona] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("numero");
  const [busqueda, setBusqueda] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [canciones, setCanciones] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [agregandoId, setAgregandoId] = useState(null);
  const [error, setError] = useState("");
  const [modoConcursoActivo, setModoConcursoActivo] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);

  const mesaSeleccionada = mesas.find((mesa) => mesa.id === mesaId) || null;
  const personas = getPersonas(mesaSeleccionada);
  const personaSeleccionada =
    personas.find((persona) => persona.id === personaId) || null;

  const cargarMesas = useCallback(async () => {
    if (!roomId) return;

    try {
      const res = await axios.get(`${API_URL}/t/mesas/${roomId}`);
      const nextMesas = res.data?.mesas || [];
      setMesas(nextMesas);
      setModoConcursoActivo(Boolean(res.data?.modoConcursoActivo));
      setMesaId((currentMesaId) => currentMesaId || nextMesas[0]?.id || "");
    } catch (err) {
      console.error("Error cargando mesas:", err);
      setError(err.response?.data?.error || "No se pudieron cargar las mesas");
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const user = `MESA-${Math.floor(Math.random() * 1000)}`;
    connectSocket({ roomId, user });
    cargarMesas();
  }, [cargarMesas, connectSocket, roomId]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const offMesas = onEvent("mesasActualizadas", (payload = {}) => {
      if (payload.roomId && payload.roomId !== roomId) return;

      const nextMesas = payload.mesas || [];
      setMesas(nextMesas);

      if (!nextMesas.some((mesa) => mesa.id === mesaId)) {
        setMesaId(nextMesas[0]?.id || "");
        setPersonaId("");
      }
    });

    const offError = onEvent("error", (message) => {
      if (typeof message === "string") {
        setError(message);
      }
    });

    return () => {
      offMesas();
      offError();
    };
  }, [mesaId, onEvent, roomId, socket]);

  useEffect(() => {
    if (!mesaSeleccionada) {
      setPersonaId("");
      return;
    }

    if (personaId && !personas.some((persona) => persona.id === personaId)) {
      setPersonaId("");
    }
  }, [mesaSeleccionada, personaId, personas]);

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
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await axios.get(SONG_SEARCH_URL, {
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
        setCanciones((prev) => {
          if (reset) return nuevasCanciones;

          const idsActuales = new Set(prev.map((cancion) => cancion._id));
          return [
            ...prev,
            ...nuevasCanciones.filter((cancion) => !idsActuales.has(cancion._id)),
          ];
        });
        setPage(res.data.page || pageToLoad);
        setHasMore(Boolean(res.data.hasMore));
      } catch (err) {
        if (axios.isCancel?.(err) || err.name === "CanceledError") return;
        console.error("Error al buscar canciones:", err);
        setToastMsg("No se pudieron cargar las canciones");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingInitial(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, filtroActivo],
  );

  useEffect(() => {
    const debounce = setTimeout(() => setDebouncedSearch(busqueda.trim()), 500);
    return () => clearTimeout(debounce);
  }, [busqueda]);

  useEffect(() => {
    setCanciones([]);
    setPage(1);
    setHasMore(true);
    fetchCanciones(1, { reset: true });
  }, [debouncedSearch, fetchCanciones, filtroActivo]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const cargarMasCanciones = () => {
    if (loadingInitial || loadingMore || !hasMore) return;
    fetchCanciones(page + 1);
  };

  const agregarCancion = async (cancion) => {
    if (!mesaId) {
      setToastMsg("Selecciona una mesa");
      return;
    }

    const nombre = nombrePersona.trim();
    if (!personaId && !nombre) {
      setToastMsg("Selecciona o escribe tu nombre");
      return;
    }

    if (modoConcursoActivo) {
      setToastMsg("Concurso activo: no se pueden agregar canciones a mesas");
      return;
    }

    setAgregandoId(cancion._id);

    try {
      const res = await axios.post(`${API_URL}/t/mesas/${roomId}/cancion`, {
        mesaId,
        personaId: personaId || undefined,
        nombrePersona: personaId ? undefined : nombre,
        songId: cancion._id,
      });

      if (Array.isArray(res.data?.mesas)) {
        setMesas(res.data.mesas);
      }

      const nextPersonaId = res.data?.personaId || personaId;
      if (nextPersonaId) {
        setPersonaId(nextPersonaId);
        setNombrePersona("");
      }

      const mesaNombre = mesaSeleccionada?.nombre || "Mesa";
      const personaNombre = personaSeleccionada?.nombre || nombre;
      setToastMsg(`Cancion agregada a ${mesaNombre} / ${personaNombre}`);

      await axios.post(`${API_URL}/song/${cancion._id}/reproducir`).catch(() => {});
    } catch (err) {
      console.error("Error agregando cancion a mesa:", err);
      if (Array.isArray(err.response?.data?.mesas)) {
        setMesas(err.response.data.mesas);
      }
      setToastMsg(err.response?.data?.error || "No se pudo agregar la cancion");
    } finally {
      setAgregandoId(null);
    }
  };

  if (!roomId) {
    return <p className="p-3">Sala invalida</p>;
  }

  return (
    <div className="sala-usuario-page p-3">
      <div className="sala-usuario-header mb-3">
        <h1 className="h3 mb-1">Mesa QR</h1>
        <div className="text-muted small">Sala {roomId}</div>
      </div>

      {!isConnected && !error && (
        <div className="alert alert-light py-2">Conectando a la sala...</div>
      )}

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {modoConcursoActivo && (
        <div className="alert alert-warning py-2">
          Concurso activo: las mesas estan bloqueadas.
        </div>
      )}

      <div className="bg-white rounded shadow-sm border p-3 mb-3">
        <label className="form-label fw-bold" htmlFor="mesa-usuario-select">
          Mesa
        </label>
        <select
          id="mesa-usuario-select"
          className="form-select mb-3"
          value={mesaId}
          onChange={(e) => {
            setMesaId(e.target.value);
            setPersonaId("");
            setNombrePersona("");
          }}
          disabled={!mesas.length || modoConcursoActivo}
        >
          {!mesas.length && <option value="">No hay mesas disponibles</option>}
          {mesas.map((mesa) => (
            <option key={mesa.id} value={mesa.id}>
              Mesa {mesa.numero}: {mesa.nombre}
            </option>
          ))}
        </select>

        <label className="form-label fw-bold" htmlFor="persona-usuario-select">
          Nombre
        </label>
        <select
          id="persona-usuario-select"
          className="form-select mb-2"
          value={personaId}
          onChange={(e) => {
            setPersonaId(e.target.value);
            if (e.target.value) setNombrePersona("");
          }}
          disabled={!mesaSeleccionada || modoConcursoActivo}
        >
          <option value="">Escribir mi nombre</option>
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.nombre}
            </option>
          ))}
        </select>

        <input
          className="form-control"
          value={nombrePersona}
          onChange={(e) => {
            setNombrePersona(e.target.value);
            setPersonaId("");
          }}
          placeholder="Tu nombre"
          disabled={!mesaSeleccionada || Boolean(personaId) || modoConcursoActivo}
        />
      </div>

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

        <label className="caja-buscar mb-0" htmlFor="busqueda-mesa">
          Buscar:
        </label>
        <div className="buscar-2">
          <input
            type="text"
            id="busqueda-mesa"
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

      {!loadingInitial && canciones.length === 0 && (
        <div className="lista-empty">No se encontraron canciones.</div>
      )}

      <div className="tarjetas">
        {canciones.map((fila) => (
          <div key={fila._id} className="bg-modificado">
            <div>
              <button
                className="video-btn list-btn"
                onClick={() => agregarCancion(fila)}
                title="Agregar a mesa"
                disabled={agregandoId === fila._id || modoConcursoActivo}
              >
                <img src="/mas.png" alt="" width="40px" />
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

      {!loadingInitial && !loadingMore && canciones.length > 0 && (
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

      <ToastModal
        mensaje={toastMsg}
        onClose={() => setToastMsg("")}
        duracion={2200}
      />
    </div>
  );
}
