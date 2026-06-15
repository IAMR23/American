import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import ToastModal from "../components/modal/ToastModal";

const STORAGE_KEY = "karaokeMesas";
const PAGE_LIMIT = 30;
const SONG_SEARCH_URL = `${API_URL}/song/search`;

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createMesa = (nombre, numero) => ({
  id: createId("mesa"),
  numero,
  nombre,
  personas: [],
});

const createPersona = (nombre) => ({
  id: createId("persona"),
  nombre,
  canciones: [],
});

export default function MesasPage({
  roomId,
  modoMesaActivo = false,
  onModoMesaChange,
}) {
  const [mesas, setMesas] = useState([]);
  const [mesaActivaId, setMesaActivaId] = useState(null);
  const [personaActivaId, setPersonaActivaId] = useState(null);
  const [nombreMesa, setNombreMesa] = useState("");
  const [nombrePersona, setNombrePersona] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("numero");
  const [busqueda, setBusqueda] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [canciones, setCanciones] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const scrollContainerRef = useRef(null);
  const observerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);

  const tieneCancionesEnMesas = (mesasToCheck) =>
    mesasToCheck.some((mesa) =>
      (mesa.personas || mesa.participantes || []).some(
        (persona) => (persona.canciones || []).length > 0,
      ),
    );

  const sincronizarModoMesa = async (nextMesas) => {
    if (!modoMesaActivo || !roomId) return;

    try {
      if (!tieneCancionesEnMesas(nextMesas)) {
        await axios.post(`${API_URL}/t/cola/modo-mesa/desactivar`, { roomId });
        onModoMesaChange?.(false);
        return;
      }

      await axios.post(`${API_URL}/t/cola/modo-mesa/activar`, {
        roomId,
        mesas: nextMesas,
      });
    } catch (error) {
      console.error("Error sincronizando Modo Mesa:", error);
      setToastMsg("No se pudo actualizar el Modo Mesa");
    }
  };

  const commitMesas = (nextMesas, { syncModoMesa = true } = {}) => {
    setMesas(nextMesas);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMesas));

    if (syncModoMesa) {
      sincronizarModoMesa(nextMesas);
    }
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        setMesas(saved);
        setMesaActivaId(saved[0]?.id || null);
        setPersonaActivaId(saved[0]?.personas?.[0]?.id || null);
      }
    } catch {
      setMesas([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mesas));
  }, [mesas]);

  const mesaActiva = useMemo(
    () => mesas.find((mesa) => mesa.id === mesaActivaId) || null,
    [mesas, mesaActivaId],
  );

  const personaActiva = useMemo(
    () =>
      mesaActiva?.personas.find((persona) => persona.id === personaActivaId) ||
      null,
    [mesaActiva, personaActivaId],
  );

  const updateMesa = (mesaId, updater) => {
    const nextMesas = mesas.map((mesa) =>
      mesa.id === mesaId ? updater(mesa) : mesa,
    );
    commitMesas(nextMesas);
  };

  const handleCrearMesa = (e) => {
    e.preventDefault();
    const nombre = nombreMesa.trim();
    if (!nombre) return;

    const maxNumero = mesas.reduce(
      (max, mesa, index) => Math.max(max, Number(mesa.numero) || index + 1),
      0,
    );
    const nuevaMesa = createMesa(nombre, maxNumero + 1);
    commitMesas([...mesas, nuevaMesa]);
    setMesaActivaId(nuevaMesa.id);
    setPersonaActivaId(null);
    setNombreMesa("");
  };

  const handleCrearPersona = (e) => {
    e.preventDefault();
    const nombre = nombrePersona.trim();
    if (!nombre || !mesaActivaId) return;

    const nuevaPersona = createPersona(nombre);
    updateMesa(mesaActivaId, (mesa) => ({
      ...mesa,
      personas: [...mesa.personas, nuevaPersona],
    }));
    setPersonaActivaId(nuevaPersona.id);
    setNombrePersona("");
  };

  const eliminarMesa = (mesaId) => {
    const restantes = mesas.filter((mesa) => mesa.id !== mesaId);
    if (mesaActivaId === mesaId) {
      setMesaActivaId(restantes[0]?.id || null);
      setPersonaActivaId(restantes[0]?.personas?.[0]?.id || null);
    }
    commitMesas(restantes);
  };

  const borrarTodo = () => {
    setMesaActivaId(null);
    setPersonaActivaId(null);
    setNombreMesa("");
    setNombrePersona("");
    commitMesas([]);
    setToastMsg("Mesas reiniciadas");
  };

  const eliminarPersona = (personaId) => {
    if (!mesaActivaId) return;

    updateMesa(mesaActivaId, (mesa) => {
      const restantes = mesa.personas.filter(
        (persona) => persona.id !== personaId,
      );
      if (personaActivaId === personaId) {
        setPersonaActivaId(restantes[0]?.id || null);
      }
      return { ...mesa, personas: restantes };
    });
  };

  const quitarCancion = (songId) => {
    if (!mesaActivaId || !personaActivaId) return;

    updateMesa(mesaActivaId, (mesa) => ({
      ...mesa,
      personas: mesa.personas.map((persona) =>
        persona.id === personaActivaId
          ? {
              ...persona,
              canciones: persona.canciones.filter(
                (cancion) => cancion._id !== songId,
              ),
            }
          : persona,
      ),
    }));
  };

  const agregarCancionAPersona = (cancion) => {
    if (!mesaActivaId || !personaActivaId) {
      setToastMsg("Selecciona una mesa y una persona");
      return;
    }

    updateMesa(mesaActivaId, (mesa) => ({
      ...mesa,
      personas: mesa.personas.map((persona) => {
        if (persona.id !== personaActivaId) return persona;

        const existe = persona.canciones.some(
          (item) => item._id === cancion._id,
        );

        if (existe) return persona;

        return {
          ...persona,
          canciones: [
            ...persona.canciones,
            {
              _id: cancion._id,
              numero: cancion.numero,
              titulo: cancion.titulo,
              artista: cancion.artista,
              videoUrl: cancion.videoUrl,
            },
          ],
        };
      }),
    }));

    setToastMsg(`Cancion agregada a ${personaActiva?.nombre || "la persona"}`);
  };

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
    [debouncedSearch, filtroActivo],
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      setDebouncedSearch(busqueda.trim());
    }, 500);

    return () => clearTimeout(debounce);
  }, [busqueda]);

  useEffect(() => {
    setCanciones([]);
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

  return (
    <div className="container-fluid px-2 px-md-3 py-2 text-dark">
      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="bg-white rounded shadow-sm p-3 mb-3">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h2 className="h4 mb-0">Mesas</h2>
              <button
                className="btn btn-outline-danger btn-sm"
                type="button"
                onClick={borrarTodo}
                disabled={!mesas.length}
              >
                Borrar todo
              </button>
            </div>

            <form className="d-flex gap-2 mb-3" onSubmit={handleCrearMesa}>
              <input
                className="form-control"
                value={nombreMesa}
                onChange={(e) => setNombreMesa(e.target.value)}
                placeholder="Nombre de la mesa"
              />
              <button className="btn btn-primary" type="submit">
                Crear
              </button>
            </form>

            <div className="d-flex flex-column gap-2">
              {mesas.map((mesa) => (
                <div
                  key={mesa.id}
                  className={`d-flex align-items-center justify-content-between rounded border p-2 ${
                    mesa.id === mesaActivaId ? "border-primary bg-light" : ""
                  }`}
                >
                  <button
                    className="btn btn-link text-start text-decoration-none flex-grow-1"
                    type="button"
                    onClick={() => {
                      setMesaActivaId(mesa.id);
                      setPersonaActivaId(mesa.personas[0]?.id || null);
                    }}
                  >
                    <strong>
                      Mesa {mesa.numero || mesas.indexOf(mesa) + 1}:{" "}
                      {mesa.nombre}
                    </strong>
                    <span className="text-muted ms-2">
                      {mesa.personas.length} personas
                    </span>
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    type="button"
                    onClick={() => eliminarMesa(mesa.id)}
                    title="Eliminar mesa"
                  >
                    X
                  </button>
                </div>
              ))}

              {!mesas.length && (
                <div className="alert alert-light mb-0">
                  Crea una mesa para empezar.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded shadow-sm p-3">
            <h3 className="h5 mb-3">
              Personas {mesaActiva ? `- ${mesaActiva.nombre}` : ""}
            </h3>

            <form className="d-flex gap-2 mb-3" onSubmit={handleCrearPersona}>
              <input
                className="form-control"
                value={nombrePersona}
                onChange={(e) => setNombrePersona(e.target.value)}
                placeholder="Nombre de la persona"
                disabled={!mesaActiva}
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={!mesaActiva}
              >
                Agregar
              </button>
            </form>

            <div className="d-flex flex-column gap-2">
              {mesaActiva?.personas.map((persona) => (
                <div
                  key={persona.id}
                  className={`d-flex align-items-center justify-content-between rounded border p-2 ${
                    persona.id === personaActivaId
                      ? "border-success bg-light"
                      : ""
                  }`}
                >
                  <button
                    className="btn btn-link text-start text-decoration-none flex-grow-1"
                    type="button"
                    onClick={() => setPersonaActivaId(persona.id)}
                  >
                    <strong>{persona.nombre}</strong>
                    <span className="text-muted ms-2">
                      {persona.canciones.length} canciones
                    </span>
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    type="button"
                    onClick={() => eliminarPersona(persona.id)}
                    title="Eliminar persona"
                  >
                    X
                  </button>
                </div>
              ))}

              {mesaActiva && !mesaActiva.personas.length && (
                <div className="alert alert-light mb-0">
                  Agrega personas a esta mesa.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="bg-white rounded shadow-sm p-3 mb-3">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
              <div>
                <h2 className="h4 mb-1">
                  Canciones de {personaActiva?.nombre || "la persona"}
                </h2>
                <div className="text-muted">
                  {mesaActiva?.nombre || "Selecciona una mesa"}
                </div>
              </div>
            </div>

            {personaActiva ? (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Numero</th>
                      <th>Cantante</th>
                      <th>Cancion</th>
                      <th className="text-end">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personaActiva.canciones.map((cancion) => (
                      <tr key={cancion._id}>
                        <td>{cancion.numero}</td>
                        <td>{cancion.artista}</td>
                        <td>{cancion.titulo}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-outline-danger btn-sm"
                            type="button"
                            onClick={() => quitarCancion(cancion._id)}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!personaActiva.canciones.length && (
                  <div className="alert alert-light mb-0">
                    Esta persona aun no tiene canciones.
                  </div>
                )}
              </div>
            ) : (
              <div className="alert alert-light mb-0">
                Selecciona o crea una persona para asignarle canciones.
              </div>
            )}
          </div>

          <div className="bg-white rounded shadow-sm p-3">
            <h3 className="h5 mb-3">Agregar canciones</h3>

            <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
              {["numero", "artista", "titulo", "generos"].map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroActivo(tipo)}
                  className={`btn ${
                    filtroActivo === tipo ? "btn-danger" : "btn-primary"
                  }`}
                  type="button"
                >
                  {tipo === "generos"
                    ? "Genero"
                    : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </button>
              ))}
              <input
                type="text"
                className="form-control"
                style={{ width: "min(100%, 260px)" }}
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {loadingInitial && (
              <div className="alert alert-info py-2 text-center">
                Cargando canciones...
              </div>
            )}

            {error && !loadingInitial && (
              <div className="alert alert-danger py-2 text-center">
                {error}
              </div>
            )}

            <div
              ref={scrollContainerRef}
              className="table-responsive"
              style={{ maxHeight: "420px", overflowY: "auto" }}
            >
              <table className="table table-striped align-middle mb-0">
                <thead className="table-dark sticky-top">
                  <tr>
                    <th>Numero</th>
                    <th>Cantante</th>
                    <th>Cancion</th>
                    <th>Genero</th>
                    <th className="text-center">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {canciones.map((fila, index) => (
                    <tr
                      key={fila._id}
                      ref={index === canciones.length - 1 ? lastRowRef : null}
                    >
                      <td>{fila.numero}</td>
                      <td>{fila.artista}</td>
                      <td>{fila.titulo}</td>
                      <td>{fila.generos?.nombre || "Sin genero"}</td>
                      <td className="text-center">
                        <button
                          className="btn btn-info btn-sm p-1"
                          type="button"
                          disabled={!personaActiva}
                          onClick={() => agregarCancionAPersona(fila)}
                          title="Agregar a persona"
                        >
                          <img src="/mas.png" alt="add" width="34" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loadingInitial && !error && canciones.length === 0 && (
                <div className="alert alert-light py-2 text-center mb-0">
                  No se encontraron canciones.
                </div>
              )}

              {loadingMore && (
                <div className="alert alert-info py-2 text-center mb-0">
                  Cargando mas canciones...
                </div>
              )}

              {!hasMore && canciones.length > 0 && (
                <div className="alert alert-light py-2 text-center mb-0">
                  No hay mas canciones por cargar.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastModal
        mensaje={toastMsg}
        onClose={() => setToastMsg("")}
        duracion={2000}
      />
    </div>
  );
}
