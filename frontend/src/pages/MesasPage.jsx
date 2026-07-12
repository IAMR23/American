import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import ToastModal from "../components/modal/ToastModal";

const STORAGE_KEY = "karaokeMesas";
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
  onOpenPlayerFullscreen,
}) {
  const [mesas, setMesas] = useState([]);
  const [mesaActivaId, setMesaActivaId] = useState(null);
  const [personaActivaId, setPersonaActivaId] = useState(null);
  const [nombreMesa, setNombreMesa] = useState("");
  const [nombrePersona, setNombrePersona] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [buscandoCancion, setBuscandoCancion] = useState(false);
  const [modoMesaLoading, setModoMesaLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

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

  const toggleComenzarMesas = async () => {
    if (modoMesaLoading) return;

    if (!roomId) {
      setToastMsg("No hay sala activa para comenzar mesas");
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

      onModoMesaChange?.(true);
      setToastMsg("Mesas comenzadas");
    } catch (error) {
      console.error("Error cambiando Modo Mesa:", error);
      setToastMsg(error.response?.data?.error || "No se pudo comenzar mesas");
    } finally {
      setModoMesaLoading(false);
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

      const yaExiste = personaActiva.canciones.some(
        (item) => item._id === cancion._id,
      );

      if (yaExiste) {
        setToastMsg(
          `${cancion.numero} - ${cancion.titulo} ya esta en esta persona`,
        );
        setBusqueda("");
        return;
      }

      agregarCancionAPersona(cancion);
      setBusqueda("");
      setToastMsg(
        `Agregada: ${cancion.numero} - ${cancion.artista} - ${cancion.titulo}`,
      );
    } catch (error) {
      console.error("Error al agregar cancion por numero:", error);
      setToastMsg("No se pudo agregar la cancion");
    } finally {
      setBuscandoCancion(false);
    }
  };

  return (
    <div className="container-fluid px-2 px-md-3 py-2 text-dark">
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
                  disabled={modoMesaLoading}
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
                  disabled={!mesas.length}
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
              />
              <button className="btn btn-primary" type="submit">
                Crear
              </button>
            </form>

            <div
              className="d-flex flex-column gap-2 pe-1"
              style={{ minHeight: 0, overflowY: "auto", flex: "1 1 auto" }}
            >
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

            <div
              className="d-flex flex-column gap-2 pe-1"
              style={{ minHeight: 0, overflowY: "auto", flex: "1 1 auto" }}
            >
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
                disabled={!personaActiva || buscandoCancion}
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={!personaActiva || buscandoCancion}
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
                  {personaActiva?.canciones.length || 0} canciones
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
