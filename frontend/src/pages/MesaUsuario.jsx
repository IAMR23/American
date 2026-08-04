import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { FaTrashAlt } from "react-icons/fa";
import { API_URL } from "../config";
import { useQueueContext } from "../hooks/QueueProvider";
import { useSocketContext } from "../hooks/SocketContext";
import ToastModal from "../components/modal/ToastModal";

const SONG_SEARCH_URL = `${API_URL}/song/search`;

const getPersonas = (mesa) => mesa?.personas || mesa?.participantes || [];

export default function MesaUsuario() {
  const { roomId } = useParams();
  const { connectSocket, isConnected, socket, onEvent } = useSocketContext();
  const {
    cola,
    modoMesaActivo,
    modoConcursoActivo: modoConcursoSocketActivo,
  } = useQueueContext();
  const [mesas, setMesas] = useState([]);
  const [mesaActivaId, setMesaActivaId] = useState("");
  const [personaActivaId, setPersonaActivaId] = useState("");
  const [nombreMesa, setNombreMesa] = useState("");
  const [nombrePersona, setNombrePersona] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargandoMesas, setCargandoMesas] = useState(false);
  const [guardandoMesas, setGuardandoMesas] = useState(false);
  const [buscandoCancion, setBuscandoCancion] = useState(false);
  const [modoMesaLoading, setModoMesaLoading] = useState(false);
  const [modoConcursoActivo, setModoConcursoActivo] = useState(false);
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const concursoBloqueado = modoConcursoActivo || modoConcursoSocketActivo;

  const aplicarMesas = useCallback((nextMesas) => {
    setMesas(Array.isArray(nextMesas) ? nextMesas : []);
  }, []);

  const cargarMesas = useCallback(async () => {
    if (!roomId) return;

    setCargandoMesas(true);
    setError("");

    try {
      const res = await axios.get(`${API_URL}/t/mesas/${roomId}`);
      const nextMesas = res.data?.mesas || [];
      aplicarMesas(nextMesas);
      setModoConcursoActivo(Boolean(res.data?.modoConcursoActivo));
      setMesaActivaId((current) => current || nextMesas[0]?.id || "");
    } catch (err) {
      console.error("Error cargando mesas:", err);
      setError(err.response?.data?.error || "No se pudieron cargar las mesas");
    } finally {
      setCargandoMesas(false);
    }
  }, [aplicarMesas, roomId]);

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
      aplicarMesas(payload.mesas || []);
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
  }, [aplicarMesas, onEvent, roomId, socket]);

  useEffect(() => {
    if (!mesas.length) {
      setMesaActivaId("");
      setPersonaActivaId("");
      return;
    }

    const mesaActual = mesas.find((mesa) => mesa.id === mesaActivaId);

    if (!mesaActual) {
      setMesaActivaId(mesas[0].id);
      setPersonaActivaId(getPersonas(mesas[0])[0]?.id || "");
      return;
    }

    const personas = getPersonas(mesaActual);
    const personaExiste = personas.some((persona) => persona.id === personaActivaId);

    if (!personaExiste) {
      setPersonaActivaId(personas[0]?.id || "");
    }
  }, [mesaActivaId, mesas, personaActivaId]);

  const mesaActiva = useMemo(
    () => mesas.find((mesa) => mesa.id === mesaActivaId) || null,
    [mesaActivaId, mesas],
  );

  const personasMesaActiva = useMemo(() => getPersonas(mesaActiva), [mesaActiva]);

  const personaActiva = useMemo(
    () => personasMesaActiva.find((persona) => persona.id === personaActivaId) || null,
    [personaActivaId, personasMesaActiva],
  );

  const hayCancionesEnMesas = useMemo(
    () =>
      mesas.some((mesa) =>
        getPersonas(mesa).some(
          (persona) => (persona.canciones || []).length > 0,
        ),
      ),
    [mesas],
  );

  const cambiosBloqueados = concursoBloqueado || guardandoMesas || !roomId;

  const guardarDesdeRespuesta = (res) => {
    if (Array.isArray(res.data?.mesas)) {
      aplicarMesas(res.data.mesas);
    }
  };

  const ejecutarCambioMesa = async (accion, mensajeError) => {
    if (cambiosBloqueados) {
      setToastMsg(
        concursoBloqueado
          ? "No se pueden editar mesas mientras el Concurso esta activo"
          : "No hay sala activa para editar mesas",
      );
      return null;
    }

    setGuardandoMesas(true);

    try {
      const res = await accion();
      guardarDesdeRespuesta(res);
      return res;
    } catch (err) {
      console.error(mensajeError, err);
      if (Array.isArray(err.response?.data?.mesas)) {
        aplicarMesas(err.response.data.mesas);
      }
      setToastMsg(err.response?.data?.error || mensajeError);
      return null;
    } finally {
      setGuardandoMesas(false);
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
      setPersonaActivaId("");
      setNombreMesa("");
      setNombrePersona("");
      setToastMsg(`Mesa creada: ${res.data.mesa.nombre}`);
    }
  };

  const handleCrearPersona = async (e) => {
    e.preventDefault();

    const nombre = nombrePersona.trim();
    if (!mesaActivaId || !nombre) {
      setToastMsg("Selecciona una mesa y escribe tu nombre");
      return;
    }

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
      setToastMsg(`Persona agregada a ${mesaActiva?.nombre || "la mesa"}`);
    }
  };

  const eliminarMesa = async (mesaId) => {
    if (!mesaId) return;

    const res = await ejecutarCambioMesa(
      () =>
        axios.delete(`${API_URL}/t/mesas/${roomId}/mesa`, {
          data: { mesaId },
        }),
      "No se pudo eliminar la mesa",
    );

    if (res && mesaActivaId === mesaId) {
      const restantes = res.data?.mesas || [];
      setMesaActivaId(restantes[0]?.id || "");
      setPersonaActivaId(getPersonas(restantes[0])[0]?.id || "");
      setNombrePersona("");
      setToastMsg("Mesa eliminada");
    }
  };

  const eliminarPersona = async (personaId) => {
    if (!mesaActivaId || !personaId) return;

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
      setPersonaActivaId(getPersonas(mesaActualizada)[0]?.id || "");
      setToastMsg("Persona eliminada");
    }
  };

  const borrarTodo = async () => {
    const res = await ejecutarCambioMesa(
      () => axios.delete(`${API_URL}/t/mesas/${roomId}/reset`),
      "No se pudieron reiniciar las mesas",
    );

    if (res) {
      setMesaActivaId("");
      setPersonaActivaId("");
      setNombreMesa("");
      setNombrePersona("");
      setBusqueda("");
      setToastMsg("Mesas reiniciadas");
    }
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

  const agregarCancionAPersona = async (cancion) => {
    const nombre = nombrePersona.trim();

    if (!mesaActivaId) {
      setToastMsg("Selecciona una mesa");
      return false;
    }

    if (!personaActivaId && !nombre) {
      setToastMsg("Selecciona o escribe tu nombre");
      return false;
    }

    const yaExiste = (personaActiva?.canciones || []).some(
      (item) => String(item._id) === String(cancion._id),
    );

    if (yaExiste) {
      setToastMsg(`${cancion.numero} - ${cancion.titulo} ya esta en esta persona`);
      return false;
    }

    const res = await ejecutarCambioMesa(
      () =>
        axios.post(`${API_URL}/t/mesas/${roomId}/cancion`, {
          mesaId: mesaActivaId,
          personaId: personaActivaId || undefined,
          nombrePersona: personaActivaId ? undefined : nombre,
          songId: cancion._id,
        }),
      "No se pudo agregar la cancion",
    );

    if (!res) return false;

    if (res.data?.personaId) {
      setPersonaActivaId(res.data.personaId);
      setNombrePersona("");
    }

    await axios.post(`${API_URL}/song/${cancion._id}/reproducir`).catch(() => {});
    return true;
  };

  const handleAgregarCancionPorNumero = async (e) => {
    e.preventDefault();

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
        const mesaNombre = mesaActiva?.nombre || "Mesa";
        const personaNombre = personaActiva?.nombre || nombrePersona.trim();
        setBusqueda("");
        setToastMsg(`Agregada a ${mesaNombre} / ${personaNombre}`);
      }
    } catch (err) {
      console.error("Error al agregar cancion por numero:", err);
      setToastMsg("No se pudo agregar la cancion");
    } finally {
      setBuscandoCancion(false);
    }
  };

  const quitarCancion = async (songId) => {
    if (!mesaActivaId || !personaActivaId || !songId) return;

    await ejecutarCambioMesa(
      () =>
        axios.delete(`${API_URL}/t/mesas/${roomId}/cancion`, {
          data: { mesaId: mesaActivaId, personaId: personaActivaId, songId },
        }),
      "No se pudo quitar la cancion",
    );
  };

  const toggleModoMesa = async () => {
    if (!roomId || modoMesaLoading) return;

    if (concursoBloqueado) {
      setToastMsg("No se puede activar mesas mientras el Concurso esta activo");
      return;
    }

    setModoMesaLoading(true);

    try {
      if (modoMesaActivo) {
        await axios.post(`${API_URL}/t/cola/modo-mesa/desactivar`, { roomId });
        setToastMsg("Mesas detenidas");
        return;
      }

      if (!hayCancionesEnMesas) {
        setToastMsg("Agrega canciones antes de comenzar mesas");
        return;
      }

      await axios.post(`${API_URL}/t/cola/modo-mesa/activar`, {
        roomId,
        mesas,
      });

      setToastMsg("Mesas comenzadas");
    } catch (err) {
      console.error("Error cambiando Modo Mesa desde celular:", err);
      setToastMsg(err.response?.data?.error || "No se pudo cambiar mesas");
    } finally {
      setModoMesaLoading(false);
    }
  };

  if (!roomId) {
    return <p className="p-3">Sala invalida</p>;
  }

  return (
    <div className="container-fluid px-2 py-2 text-dark">
      <div className="bg-white rounded shadow-sm border p-3 mb-3">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div>
            <h1 className="h4 fw-bold mb-1">Mesas PRUEBA 1</h1>
            <div className="text-muted small">Sala {roomId}</div>
          </div>
          <div className="text-end">
            <span className={`badge ${modoMesaActivo ? "bg-success" : "bg-secondary"}`}>
              {modoMesaActivo ? "Modo mesa activo" : "Modo mesa detenido"}
            </span>
            <div className="small text-muted mt-1">{cola.length} en cola</div>
          </div>
        </div>
        <button
          className={`btn w-100 mt-3 ${
            modoMesaActivo ? "btn-outline-danger" : "btn-success"
          }`}
          type="button"
          onClick={toggleModoMesa}
          disabled={modoMesaLoading || cargandoMesas || concursoBloqueado}
        >
          {modoMesaLoading
            ? "Procesando..."
            : modoMesaActivo
              ? "Detener mesas"
              : "Comenzar mesas"}
        </button>
      </div>

      {!isConnected && !error && (
        <div className="alert alert-light py-2">Conectando a la sala...</div>
      )}

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {concursoBloqueado && (
        <div className="alert alert-warning py-2">
          Concurso activo: las mesas estan bloqueadas.
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        <div className="bg-white rounded shadow-sm p-3 d-flex flex-column border">
          <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
            <h2 className="h5 mb-0">Mesas</h2>
            <div className="d-flex align-items-center gap-2">
              {cargandoMesas && <span className="text-muted small">Cargando...</span>}
              <button
                className="btn btn-outline-danger btn-sm"
                type="button"
                onClick={borrarTodo}
                disabled={!mesas.length || cambiosBloqueados}
                title="Borrar todo"
                aria-label="Borrar todas las mesas"
              >
                <FaTrashAlt aria-hidden="true" />
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
              className="btn btn-danger"
              type="submit"
              disabled={cambiosBloqueados || !nombreMesa.trim()}
            >
              Crear
            </button>
          </form>

          <div className="d-flex flex-column gap-2">
            {mesas.map((mesa) => {
              const personas = getPersonas(mesa);
              const mesaSeleccionada = mesa.id === mesaActivaId;

              return (
                <div
                  key={mesa.id}
                  className="d-flex align-items-stretch gap-2"
                >
                  <button
                    className={`btn text-start rounded border p-2 shadow-sm flex-grow-1 ${
                      mesaSeleccionada
                        ? "btn-danger border-danger text-white"
                        : "btn-light text-dark"
                    }`}
                    type="button"
                    onClick={() => {
                      setMesaActivaId(mesa.id);
                      setPersonaActivaId(personas[0]?.id || "");
                      setNombrePersona("");
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between gap-2">
                      <div>
                        <strong>
                          Mesa {mesa.numero || mesas.indexOf(mesa) + 1}:{" "}
                          {mesa.nombre}
                        </strong>
                        <span
                          className={`ms-2 ${
                            mesaSeleccionada ? "text-white-50" : "text-muted"
                          }`}
                        >
                          {personas.length} personas
                        </span>
                      </div>
                      {mesaSeleccionada && (
                        <span className="badge bg-light text-danger">
                          Seleccionada
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    className="btn btn-outline-danger px-3"
                    type="button"
                    onClick={() => eliminarMesa(mesa.id)}
                    disabled={cambiosBloqueados}
                    title="Eliminar mesa"
                    aria-label={`Eliminar mesa ${mesa.nombre}`}
                  >
                    <FaTrashAlt aria-hidden="true" />
                  </button>
                </div>
              );
            })}

            {!cargandoMesas && !mesas.length && (
              <div className="alert alert-light mb-0">
                El host aun no ha creado mesas.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded shadow-sm p-3 d-flex flex-column border">
          <h3 className="h5 mb-3">
            Personas {mesaActiva ? `- ${mesaActiva.nombre}` : ""}
          </h3>

          <form className="d-flex gap-2 mb-3" onSubmit={handleCrearPersona}>
            <input
              className="form-control"
              value={nombrePersona}
              onChange={(e) => {
                setNombrePersona(e.target.value);
                setPersonaActivaId("");
              }}
              placeholder="Nombre de la persona"
              disabled={!mesaActiva || cambiosBloqueados}
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!mesaActiva || cambiosBloqueados || !nombrePersona.trim()}
            >
              Agregar
            </button>
          </form>

          <div className="d-flex flex-column gap-2">
            {personasMesaActiva.map((persona) => {
              const personaSeleccionada = persona.id === personaActivaId;

              return (
                <div
                  key={persona.id}
                  className="d-flex align-items-stretch gap-2"
                >
                  <button
                    className={`btn text-start rounded border p-2 shadow-sm flex-grow-1 ${
                      personaSeleccionada
                        ? "btn-dark border-dark text-white"
                        : "btn-light text-dark"
                    }`}
                    type="button"
                    onClick={() => {
                      setPersonaActivaId(persona.id);
                      setNombrePersona("");
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between gap-2">
                      <div>
                        <strong>{persona.nombre}</strong>
                        <span
                          className={`ms-2 ${
                            personaSeleccionada ? "text-white-50" : "text-muted"
                          }`}
                        >
                          {(persona.canciones || []).length} canciones
                        </span>
                      </div>
                      {personaSeleccionada && (
                        <span className="badge bg-light text-dark">
                          Seleccionado
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    className="btn btn-outline-danger px-3"
                    type="button"
                    onClick={() => eliminarPersona(persona.id)}
                    disabled={cambiosBloqueados}
                    title="Eliminar persona"
                    aria-label={`Eliminar persona ${persona.nombre}`}
                  >
                    <FaTrashAlt aria-hidden="true" />
                  </button>
                </div>
              );
            })}

            {mesaActiva && !personasMesaActiva.length && (
              <div className="alert alert-light mb-0">
                Agrega tu nombre para cantar en esta mesa.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded shadow-sm p-3 border">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <div>
              <h2 className="h5 mb-1">Agregar canciones</h2>
              <div className="text-muted small">
                {mesaActiva?.nombre || "Selecciona una mesa"}
                {personaActiva ? ` / ${personaActiva.nombre}` : ""}
              </div>
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
              disabled={!mesaActiva || buscandoCancion || cambiosBloqueados}
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!mesaActiva || buscandoCancion || cambiosBloqueados}
            >
              {buscandoCancion ? "Agregando..." : "Agregar"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded shadow-sm p-3 d-flex flex-column border">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <div>
              <h2 className="h5 mb-1">
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
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
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
                          title="Quitar cancion"
                          aria-label={`Quitar ${cancion.titulo || "cancion"}`}
                        >
                          <FaTrashAlt aria-hidden="true" />
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

      <ToastModal
        mensaje={toastMsg}
        onClose={() => setToastMsg("")}
        duracion={2200}
      />
    </div>
  );
}
