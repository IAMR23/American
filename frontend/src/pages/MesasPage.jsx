import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import ToastModal from "../components/modal/ToastModal";
import { useSocketContext } from "../hooks/SocketContext";

const STORAGE_KEY = "karaokeMesas";
const SONG_SEARCH_URL = `${API_URL}/song/search`;

const getPersonas = (mesa) => mesa?.personas || mesa?.participantes || [];

export default function MesasPage({
  roomId,
  modoMesaActivo = false,
  modoConcursoActivo = false,
  onModoMesaChange,
  onOpenPlayerFullscreen,
}) {
  const [mesas, setMesas] = useState([]);
  const [mesaActivaId, setMesaActivaId] = useState(null);
  const [personaActivaId, setPersonaActivaId] = useState(null);
  const [nombreMesa, setNombreMesa] = useState("");
  const [nombrePersona, setNombrePersona] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [buscandoCancion, setBuscandoCancion] = useState(false);
  const [cargandoMesas, setCargandoMesas] = useState(false);
  const [guardandoMesas, setGuardandoMesas] = useState(false);
  const [modoMesaLoading, setModoMesaLoading] = useState(false);
  const [mesasInicializadas, setMesasInicializadas] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const { socket, onEvent } = useSocketContext();
  const lastSyncedMesasRef = useRef("");

  const aplicarMesas = useCallback((nextMesas) => {
    const mesasValidas = Array.isArray(nextMesas) ? nextMesas : [];
    setMesas(mesasValidas);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mesasValidas));
  }, []);

  const tieneCancionesEnMesas = useCallback((mesasToCheck) =>
    mesasToCheck.some((mesa) =>
      getPersonas(mesa).some((persona) => (persona.canciones || []).length > 0),
    ), []);

  const sincronizarModoMesa = useCallback(
    async (nextMesas) => {
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
    },
    [modoMesaActivo, onModoMesaChange, roomId, tieneCancionesEnMesas],
  );

  const cargarMesas = useCallback(async () => {
    if (!roomId) return;

    setCargandoMesas(true);

    try {
      const res = await axios.get(`${API_URL}/t/mesas/${roomId}`);
      aplicarMesas(res.data?.mesas || []);
    } catch (error) {
      console.error("Error cargando mesas:", error);

      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        aplicarMesas(saved);
      } catch {
        aplicarMesas([]);
      }

      setToastMsg(error.response?.data?.error || "No se pudieron cargar las mesas");
    } finally {
      setCargandoMesas(false);
      setMesasInicializadas(true);
    }
  }, [aplicarMesas, roomId]);

  useEffect(() => {
    cargarMesas();
  }, [cargarMesas]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const off = onEvent("mesasActualizadas", (payload = {}) => {
      if (payload.roomId && payload.roomId !== roomId) return;
      aplicarMesas(payload.mesas || []);
      setMesasInicializadas(true);
    });

    return off;
  }, [aplicarMesas, onEvent, roomId, socket]);

  useEffect(() => {
    if (!mesasInicializadas || !modoMesaActivo || !roomId) return;

    const syncKey = JSON.stringify(mesas);
    if (syncKey === lastSyncedMesasRef.current) return;

    lastSyncedMesasRef.current = syncKey;
    const timeout = setTimeout(() => sincronizarModoMesa(mesas), 300);

    return () => clearTimeout(timeout);
  }, [mesas, mesasInicializadas, modoMesaActivo, roomId, sincronizarModoMesa]);

  useEffect(() => {
    if (!mesas.length) {
      setMesaActivaId(null);
      setPersonaActivaId(null);
      return;
    }

    const mesaActual = mesas.find((mesa) => mesa.id === mesaActivaId);

    if (!mesaActual) {
      setMesaActivaId(mesas[0].id);
      setPersonaActivaId(getPersonas(mesas[0])[0]?.id || null);
      return;
    }

    const personas = getPersonas(mesaActual);
    const personaExiste = personas.some((persona) => persona.id === personaActivaId);

    if (!personaExiste) {
      setPersonaActivaId(personas[0]?.id || null);
    }
  }, [mesaActivaId, mesas, personaActivaId]);

  const mesaActiva = useMemo(
    () => mesas.find((mesa) => mesa.id === mesaActivaId) || null,
    [mesas, mesaActivaId],
  );

  const personasMesaActiva = useMemo(() => getPersonas(mesaActiva), [mesaActiva]);

  const personaActiva = useMemo(
    () => personasMesaActiva.find((persona) => persona.id === personaActivaId) || null,
    [personaActivaId, personasMesaActiva],
  );

  const asegurarEdicionDisponible = () => {
    if (!roomId) {
      setToastMsg("No hay sala activa para editar mesas");
      return false;
    }

    if (modoConcursoActivo) {
      setToastMsg("No se pueden editar mesas mientras el Concurso esta activo");
      return false;
    }

    return true;
  };

  const guardarDesdeRespuesta = (res) => {
    if (Array.isArray(res.data?.mesas)) {
      aplicarMesas(res.data.mesas);
    }
  };

  const ejecutarCambioMesa = async (accion, mensajeError) => {
    if (!asegurarEdicionDisponible() || guardandoMesas) return null;

    setGuardandoMesas(true);

    try {
      const res = await accion();
      guardarDesdeRespuesta(res);
      return res;
    } catch (error) {
      console.error(mensajeError, error);
      if (Array.isArray(error.response?.data?.mesas)) {
        aplicarMesas(error.response.data.mesas);
      }
      setToastMsg(error.response?.data?.error || mensajeError);
      return null;
    } finally {
      setGuardandoMesas(false);
    }
  };

  const toggleComenzarMesas = async () => {
    if (modoMesaLoading) return;

    if (!roomId) {
      setToastMsg("No hay sala activa para comenzar mesas");
      return;
    }

    if (modoConcursoActivo) {
      setToastMsg("No se puede comenzar mesas mientras el Concurso esta activo");
      return;
    }

    setModoMesaLoading(true);

    try {
      if (modoMesaActivo) {
        await axios.post(`${API_URL}/t/cola/modo-mesa/desactivar`, { roomId });
        onModoMesaChange?.(false);
        setToastMsg("Mesas detenidas");
        return;
      }

      if (!tieneCancionesEnMesas(mesas)) {
        setToastMsg("Agrega canciones antes de comenzar mesas");
        return;
      }

      onOpenPlayerFullscreen?.();

      await axios.post(`${API_URL}/t/cola/modo-mesa/activar`, {
        roomId,
        mesas,
      });

      lastSyncedMesasRef.current = JSON.stringify(mesas);
      onModoMesaChange?.(true);
      setToastMsg("Mesas comenzadas");
    } catch (error) {
      console.error("Error cambiando Modo Mesa:", error);
      setToastMsg(error.response?.data?.error || "No se pudo comenzar mesas");
    } finally {
      setModoMesaLoading(false);
    }
  };

  const handleCrearMesa = async (e) => {
    e.preventDefault();
    const nombre = nombreMesa.trim();
    if (!nombre) {
      setToastMsg("Escribe el nombre de la mesa");
      return;
    }

    const res = await ejecutarCambioMesa(
      () => axios.post(`${API_URL}/t/mesas/${roomId}/mesa`, { nombre }),
      "No se pudo crear la mesa",
    );

    if (res?.data?.mesa) {
      setMesaActivaId(res.data.mesa.id);
      setPersonaActivaId(null);
      setNombreMesa("");
    }
  };

  const handleCrearPersona = async (e) => {
    e.preventDefault();
    const nombre = nombrePersona.trim();
    if (!nombre || !mesaActivaId) return;

    const res = await ejecutarCambioMesa(
      () =>
        axios.post(`${API_URL}/t/mesas/${roomId}/persona`, {
          mesaId: mesaActivaId,
          nombre,
        }),
      "No se pudo crear la persona",
    );

    if (res?.data?.persona) {
      setPersonaActivaId(res.data.persona.id);
      setNombrePersona("");
    }
  };

  const eliminarMesa = async (mesaId) => {
    const res = await ejecutarCambioMesa(
      () =>
        axios.delete(`${API_URL}/t/mesas/${roomId}/mesa`, {
          data: { mesaId },
        }),
      "No se pudo eliminar la mesa",
    );

    if (res && mesaActivaId === mesaId) {
      const restantes = res.data?.mesas || [];
      setMesaActivaId(restantes[0]?.id || null);
      setPersonaActivaId(getPersonas(restantes[0])[0]?.id || null);
    }
  };

  const borrarTodo = async () => {
    const res = await ejecutarCambioMesa(
      () => axios.delete(`${API_URL}/t/mesas/${roomId}/reset`),
      "No se pudieron reiniciar las mesas",
    );

    if (res) {
      setMesaActivaId(null);
      setPersonaActivaId(null);
      setNombreMesa("");
      setNombrePersona("");
      setToastMsg("Mesas reiniciadas");
    }
  };

  const eliminarPersona = async (personaId) => {
    if (!mesaActivaId) return;

    const res = await ejecutarCambioMesa(
      () =>
        axios.delete(`${API_URL}/t/mesas/${roomId}/persona`, {
          data: { mesaId: mesaActivaId, personaId },
        }),
      "No se pudo eliminar la persona",
    );

    if (res && personaActivaId === personaId) {
      const mesaActualizada = (res.data?.mesas || []).find(
        (mesa) => mesa.id === mesaActivaId,
      );
      setPersonaActivaId(getPersonas(mesaActualizada)[0]?.id || null);
    }
  };

  const quitarCancion = async (songId) => {
    if (!mesaActivaId || !personaActivaId) return;

    await ejecutarCambioMesa(
      () =>
        axios.delete(`${API_URL}/t/mesas/${roomId}/cancion`, {
          data: { mesaId: mesaActivaId, personaId: personaActivaId, songId },
        }),
      "No se pudo quitar la cancion",
    );
  };

  const agregarCancionAPersona = async (cancion) => {
    if (!mesaActivaId || !personaActivaId) {
      setToastMsg("Selecciona una mesa y una persona");
      return false;
    }

    const existe = (personaActiva?.canciones || []).some(
      (item) => String(item._id) === String(cancion._id),
    );

    if (existe) {
      setToastMsg(`${cancion.numero} - ${cancion.titulo} ya esta en esta persona`);
      return false;
    }

    const res = await ejecutarCambioMesa(
      () =>
        axios.post(`${API_URL}/t/mesas/${roomId}/cancion`, {
          mesaId: mesaActivaId,
          personaId: personaActivaId,
          songId: cancion._id,
        }),
      "No se pudo agregar la cancion",
    );

    if (!res) return false;

    setToastMsg(`Cancion agregada a ${personaActiva?.nombre || "la persona"}`);
    return true;
  };

  const buscarCancionExactaPorNumero = async (numero) => {
    const res = await axios.get(SONG_SEARCH_URL, {
      params: {
        page: 1,
        limit: 100,
        search: String(numero),
        filtro: "numero",
      },
    });

    return (res.data.canciones || res.data || []).find(
      (cancion) => Number(cancion.numero) === Number(numero),
    );
  };

  const handleAgregarCancionPorNumero = async (e) => {
    e.preventDefault();

    if (!personaActiva) {
      setToastMsg("Selecciona una persona");
      return;
    }

    const numero = busqueda.trim();
    if (!numero) return;

    setBuscandoCancion(true);

    try {
      const cancion = await buscarCancionExactaPorNumero(numero);

      if (!cancion?._id) {
        setToastMsg(`No se encontro la cancion numero ${numero}`);
        return;
      }

      const agregada = await agregarCancionAPersona(cancion);

      if (agregada) {
        setBusqueda("");
        setToastMsg(
          `Agregada: ${cancion.numero} - ${cancion.artista} - ${cancion.titulo}`,
        );
      }
    } catch (error) {
      console.error("Error al agregar cancion por numero:", error);
      setToastMsg("No se pudo agregar la cancion");
    } finally {
      setBuscandoCancion(false);
    }
  };

  const cambiosBloqueados = modoConcursoActivo || guardandoMesas;

  return (
    <div className="container-fluid px-2 px-md-3 py-2 text-dark">
      {modoConcursoActivo && (
        <div className="alert alert-warning py-2 mb-2">
          Concurso activo: los cambios de mesas estan bloqueados.
        </div>
      )}

      <div
        className="row g-3 align-items-stretch"
        style={{ height: "calc(100vh - 220px)", minHeight: 560, maxHeight: 760 }}
      >
        <div className="col-12 col-lg-4 h-100">
          <div className="d-flex flex-column gap-3 h-100" style={{ minHeight: 0 }}>
            <div
              className="bg-white rounded shadow-sm p-3 d-flex flex-column border"
              style={{ minHeight: 0, flex: "1 1 0", overflow: "hidden" }}
            >
              <div className="d-flex align-items-center justify-content-between gap-2 mb-3 flex-wrap">
                <h2 className="h4 mb-0">Mesas</h2>
                <div className="d-flex align-items-center gap-2">
                  <button
                    className={`btn btn-success btn-sm ${
                      modoMesaActivo ? "boto-activo" : ""
                    }`}
                    type="button"
                    onClick={toggleComenzarMesas}
                    disabled={modoMesaLoading || cargandoMesas || modoConcursoActivo}
                    title={
                      modoMesaActivo
                        ? "Detener mesas"
                        : "Comenzar modo de mesas"
                    }
                  >
                    {modoMesaLoading
                      ? "Procesando..."
                      : modoMesaActivo
                        ? "Mesas activas"
                        : "Comenzar mesas"}
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    type="button"
                    onClick={borrarTodo}
                    disabled={!mesas.length || cambiosBloqueados}
                  >
                    Borrar todo
                  </button>
                </div>
              </div>

              <form className="d-flex gap-2 mb-3" onSubmit={handleCrearMesa}>
                <input
                  className="form-control"
                  value={nombreMesa}
                  onChange={(e) => setNombreMesa(e.target.value)}
                  placeholder="Nombre de la mesa"
                  disabled={cambiosBloqueados}
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={cambiosBloqueados}
                >
                  Crear
                </button>
              </form>

              <div
                className="d-flex flex-column gap-2 pe-1"
                style={{ minHeight: 0, overflowY: "auto", flex: "1 1 auto" }}
              >
                {mesas.map((mesa) => {
                  const personas = getPersonas(mesa);

                  return (
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
                          setPersonaActivaId(personas[0]?.id || null);
                        }}
                      >
                        <strong>
                          Mesa {mesa.numero || mesas.indexOf(mesa) + 1}:{" "}
                          {mesa.nombre}
                        </strong>
                        <span className="text-muted ms-2">
                          {personas.length} personas
                        </span>
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        type="button"
                        onClick={() => eliminarMesa(mesa.id)}
                        title="Eliminar mesa"
                        disabled={cambiosBloqueados}
                      >
                        X
                      </button>
                    </div>
                  );
                })}

                {cargandoMesas && (
                  <div className="alert alert-light mb-0">Cargando mesas...</div>
                )}

                {!cargandoMesas && !mesas.length && (
                  <div className="alert alert-light mb-0">
                    Crea una mesa para empezar.
                  </div>
                )}
              </div>
            </div>

            <div
              className="bg-white rounded shadow-sm p-3 d-flex flex-column border"
              style={{ minHeight: 0, flex: "1 1 0", overflow: "hidden" }}
            >
              <h3 className="h5 mb-3">
                Personas {mesaActiva ? `- ${mesaActiva.nombre}` : ""}
              </h3>

              <form className="d-flex gap-2 mb-3" onSubmit={handleCrearPersona}>
                <input
                  className="form-control"
                  value={nombrePersona}
                  onChange={(e) => setNombrePersona(e.target.value)}
                  placeholder="Nombre de la persona"
                  disabled={!mesaActiva || cambiosBloqueados}
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={!mesaActiva || cambiosBloqueados}
                >
                  Agregar
                </button>
              </form>

              <div
                className="d-flex flex-column gap-2 pe-1"
                style={{ minHeight: 0, overflowY: "auto", flex: "1 1 auto" }}
              >
                {personasMesaActiva.map((persona) => (
                  <div
                    key={persona.id}
                    className={`d-flex align-items-center justify-content-between rounded border p-2 ${
                      persona.id === personaActivaId ? "border-success bg-light" : ""
                    }`}
                  >
                    <button
                      className="btn btn-link text-start text-decoration-none flex-grow-1"
                      type="button"
                      onClick={() => setPersonaActivaId(persona.id)}
                    >
                      <strong>{persona.nombre}</strong>
                      <span className="text-muted ms-2">
                        {(persona.canciones || []).length} canciones
                      </span>
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      type="button"
                      onClick={() => eliminarPersona(persona.id)}
                      title="Eliminar persona"
                      disabled={cambiosBloqueados}
                    >
                      X
                    </button>
                  </div>
                ))}

                {mesaActiva && !personasMesaActiva.length && (
                  <div className="alert alert-light mb-0">
                    Agrega personas a esta mesa.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8 h-100">
          <div className="d-flex flex-column gap-3 h-100" style={{ minHeight: 0 }}>
            <div className="bg-white rounded shadow-sm p-3 border">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h2 className="h5 mb-1">Agregar canciones</h2>
                  <div className="text-muted small">
                    {mesaActiva?.nombre || "Selecciona una mesa"}
                    {personaActiva ? ` / ${personaActiva.nombre}` : ""}
                  </div>
                </div>

                <form
                  className="d-flex align-items-center flex-wrap gap-2 mb-0"
                  onSubmit={handleAgregarCancionPorNumero}
                >
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: "min(100%, 260px)" }}
                    placeholder="Numero de la cancion"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    disabled={!personaActiva || buscandoCancion || cambiosBloqueados}
                  />
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={!personaActiva || buscandoCancion || cambiosBloqueados}
                  >
                    {buscandoCancion ? "Agregando..." : "Agregar"}
                  </button>
                </form>
              </div>
            </div>

            <div
              className="bg-white rounded shadow-sm p-3 d-flex flex-column border"
              style={{ minHeight: 0, flex: "1 1 auto", overflow: "hidden" }}
            >
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div>
                  <h2 className="h4 mb-1">
                    Canciones de {personaActiva?.nombre || "la persona"}
                  </h2>
                  <div className="text-muted">
                    {mesaActiva?.nombre || "Selecciona una mesa"}
                  </div>
                </div>
                <span className="badge bg-secondary">
                  {(personaActiva?.canciones || []).length} canciones
                </span>
              </div>

              {personaActiva ? (
                <div
                  className="table-responsive pe-1"
                  style={{ minHeight: 0, overflowY: "auto", flex: "1 1 auto" }}
                >
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Numero</th>
                        <th>Cantante</th>
                        <th>Cancion</th>
                        <th className="text-end">Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(personaActiva.canciones || []).map((cancion) => (
                        <tr key={cancion._id}>
                          <td>{cancion.numero}</td>
                          <td>{cancion.artista}</td>
                          <td>{cancion.titulo}</td>
                          <td className="text-end">
                            <button
                              className="btn btn-outline-danger btn-sm"
                              type="button"
                              onClick={() => quitarCancion(cancion._id)}
                              disabled={cambiosBloqueados}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!(personaActiva.canciones || []).length && (
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
