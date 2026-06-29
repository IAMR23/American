import { useMemo, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import ToastModal from "../components/modal/ToastModal";

const STORAGE_KEY = "karaokeConcurso";
const SONG_SEARCH_URL = `${API_URL}/song/search`;

const createId = () =>
  `participante-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      cancionesPorParticipante: Number(saved.cancionesPorParticipante) || 1,
      participantes: Array.isArray(saved.participantes)
        ? saved.participantes
        : [],
    };
  } catch {
    return { cancionesPorParticipante: 1, participantes: [] };
  }
};

export default function ConcursoPage({
  roomId,
  modoConcursoActivo = false,
  modoCalificacionActivo = false,
  onModoConcursoChange,
}) {
  const initialState = useMemo(loadState, []);
  const [participantes, setParticipantes] = useState(initialState.participantes);
  const [cancionesPorParticipante, setCancionesPorParticipante] = useState(
    initialState.cancionesPorParticipante,
  );
  const [participanteActivoId, setParticipanteActivoId] = useState(
    initialState.participantes[0]?.id || null,
  );
  const [nombreParticipante, setNombreParticipante] = useState("");
  const [numeroCancion, setNumeroCancion] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const participanteActivo =
    participantes.find((item) => item.id === participanteActivoId) || null;
  const edicionBloqueada = modoConcursoActivo;
  const puedeCambiarCantidad = !modoConcursoActivo;
  const maxCancionesAsignadas = Math.max(
    0,
    ...participantes.map((participante) => participante.canciones.length),
  );

  const persistir = (nextParticipantes, nextCantidad = cancionesPorParticipante) => {
    setParticipantes(nextParticipantes);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cancionesPorParticipante: nextCantidad,
        participantes: nextParticipantes,
      }),
    );
  };

  const handleCantidadChange = (e) => {
    const requested = Math.max(1, Number(e.target.value) || 1);
    const next = Math.max(requested, maxCancionesAsignadas);

    if (requested < maxCancionesAsignadas) {
      setToastMsg(
        `No puedes bajar de ${maxCancionesAsignadas} porque ya hay participantes con esa cantidad de canciones`,
      );
    } else if (next > cancionesPorParticipante) {
      setToastMsg(`Ahora cada participante debe completar ${next} canciones`);
    }

    setCancionesPorParticipante(next);
    persistir(participantes, next);
  };

  const agregarParticipante = (e) => {
    e.preventDefault();
    if (edicionBloqueada) return;

    const nombre = nombreParticipante.trim();
    if (!nombre) return;

    const nuevo = { id: createId(), nombre, canciones: [] };
    const next = [...participantes, nuevo];

    persistir(next);
    setParticipanteActivoId(nuevo.id);
    setNombreParticipante("");
  };

  const buscarCancionPorNumero = async (numero) => {
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

  const agregarCancion = async (e) => {
    e.preventDefault();
    if (edicionBloqueada) return;

    if (!participanteActivo) {
      setToastMsg("Selecciona un participante");
      return;
    }

    if (participanteActivo.canciones.length >= cancionesPorParticipante) {
      setToastMsg("Este participante ya ha elegido todas sus canciones");
      return;
    }

    const numero = numeroCancion.trim();
    if (!numero) return;

    setLoading(true);

    try {
      const cancion = await buscarCancionPorNumero(numero);

      if (!cancion?._id) {
        setToastMsg(`No se encontro la cancion numero ${numero}`);
        return;
      }

      const yaExiste = participanteActivo.canciones.some(
        (item) => item._id === cancion._id,
      );

      if (yaExiste) {
        setToastMsg("Esa cancion ya esta asignada a este participante");
        setNumeroCancion("");
        return;
      }

      const next = participantes.map((participante) =>
        participante.id === participanteActivo.id
          ? {
              ...participante,
              canciones: [
                ...participante.canciones,
                {
                  _id: cancion._id,
                  numero: cancion.numero,
                  titulo: cancion.titulo,
                  artista: cancion.artista,
                  videoUrl: cancion.videoUrl,
                },
              ],
            }
          : participante,
      );

      persistir(next);
      setNumeroCancion("");
      setToastMsg(`Agregada: ${cancion.numero} - ${cancion.titulo}`);
    } catch (error) {
      console.error("Error agregando cancion al concurso:", error);
      setToastMsg("No se pudo agregar la cancion");
    } finally {
      setLoading(false);
    }
  };

  const eliminarParticipante = async (participanteId) => {
    const next = participantes.filter((item) => item.id !== participanteId);

    if (modoConcursoActivo && roomId) {
      try {
        await axios.post(`${API_URL}/t/cola/modo-concurso/eliminar-participante`, {
          roomId,
          participanteId,
        });
      } catch (error) {
        console.error("Error eliminando participante del concurso:", error);
        setToastMsg("No se pudo eliminar el participante del concurso");
        return;
      }
    }

    persistir(next);

    if (participanteActivoId === participanteId) {
      setParticipanteActivoId(next[0]?.id || null);
    }

    setToastMsg("Participante eliminado");
  };

  const limpiarConcurso = async () => {
    if (loading) return;

    if (!participantes.length && !modoConcursoActivo) {
      setToastMsg("No hay participantes para limpiar");
      return;
    }

    setLoading(true);

    try {
      if (modoConcursoActivo && roomId) {
        await axios.post(`${API_URL}/t/cola/modo-concurso/desactivar`, {
          roomId,
          finalizado: true,
        });
        onModoConcursoChange?.(false);
      }

      persistir([]);
      setParticipanteActivoId(null);
      setNombreParticipante("");
      setNumeroCancion("");
      setToastMsg("Concurso limpiado");
    } catch (error) {
      console.error("Error limpiando concurso:", error);
      setToastMsg(error.response?.data?.error || "No se pudo limpiar el concurso");
    } finally {
      setLoading(false);
    }
  };

  const quitarCancion = (songId) => {
    if (edicionBloqueada || !participanteActivo) return;

    const next = participantes.map((participante) =>
      participante.id === participanteActivo.id
        ? {
            ...participante,
            canciones: participante.canciones.filter(
              (cancion) => cancion._id !== songId,
            ),
          }
        : participante,
    );

    persistir(next);
  };

  const participantesListos = participantes.every(
    (participante) => participante.canciones.length === cancionesPorParticipante,
  );

  const toggleConcurso = async () => {
    if (modoCalificacionActivo && !modoConcursoActivo) {
      setToastMsg("Apaga Calificacion antes de iniciar Concurso");
      return;
    }

    if (!roomId) {
      setToastMsg("No hay sala activa");
      return;
    }

    setLoading(true);

    try {
      if (modoConcursoActivo) {
        await axios.post(`${API_URL}/t/cola/modo-concurso/desactivar`, {
          roomId,
        });
        onModoConcursoChange?.(false);
        setToastMsg("Concurso detenido");
        return;
      }

      if (!participantes.length) {
        setToastMsg("Agrega participantes al concurso");
        return;
      }

      if (!participantesListos) {
        setToastMsg(
          `Todos deben tener ${cancionesPorParticipante} canciones para comenzar`,
        );
        return;
      }

      await axios.post(`${API_URL}/t/cola/modo-concurso/activar`, {
        roomId,
        participantes,
        cancionesPorParticipante,
      });

      onModoConcursoChange?.(true);
      setToastMsg("Concurso iniciado");
    } catch (error) {
      console.error("Error cambiando concurso:", error);
      setToastMsg(error.response?.data?.error || "No se pudo iniciar concurso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid px-2 px-md-3 py-2 text-dark">
      <div
        className="row g-3 align-items-stretch"
        style={{ height: "calc(100vh - 220px)", minHeight: 560, maxHeight: 760 }}
      >
        <div className="col-12 col-lg-4 h-100">
          <div
            className="bg-white rounded shadow-sm p-3 d-flex flex-column border h-100"
            style={{ minHeight: 0, overflow: "hidden" }}
          >
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3 flex-wrap">
              <h2 className="h4 mb-0">Concurso</h2>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <button
                  className={`btn btn-success btn-sm ${
                    modoConcursoActivo ? "boto-activo" : ""
                  }`}
                  type="button"
                  onClick={toggleConcurso}
                  disabled={loading || (modoCalificacionActivo && !modoConcursoActivo)}
                >
                  {modoConcursoActivo ? "Concurso activo" : "Comenzar concurso"}
                </button>
                <button
                  className="btn btn-outline-danger btn-sm"
                  type="button"
                  onClick={limpiarConcurso}
                  disabled={loading || (!participantes.length && !modoConcursoActivo)}
                >
                  Limpiar concurso
                </button>
              </div>
            </div>

            <label className="form-label">Canciones por participante</label>
            <input
              className="form-control mb-3"
              type="number"
              min="1"
              value={cancionesPorParticipante}
              onChange={handleCantidadChange}
              disabled={!puedeCambiarCantidad}
            />
            <div className="text-muted small mb-3">
              Puedes aumentar la cantidad para completar nuevas canciones por
              participante. No se puede bajar por debajo de las canciones ya
              asignadas.
            </div>

            <form className="d-flex gap-2 mb-3" onSubmit={agregarParticipante}>
              <input
                className="form-control"
                value={nombreParticipante}
                onChange={(e) => setNombreParticipante(e.target.value)}
                placeholder="Nombre del participante"
                disabled={edicionBloqueada}
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={edicionBloqueada}
              >
                Agregar
              </button>
            </form>

            <div
              className="d-flex flex-column gap-2 pe-1"
              style={{ minHeight: 0, overflowY: "auto", flex: "1 1 auto" }}
            >
              {participantes.map((participante) => (
                <div
                  key={participante.id}
                  className={`d-flex align-items-center justify-content-between rounded border p-2 ${
                    participante.id === participanteActivoId
                      ? "border-primary bg-light"
                      : ""
                  }`}
                >
                  <button
                    className="btn btn-link text-start text-decoration-none flex-grow-1"
                    type="button"
                    onClick={() => setParticipanteActivoId(participante.id)}
                  >
                    <strong>{participante.nombre}</strong>
                    <span className="text-muted ms-2">
                      {participante.canciones.length}/{cancionesPorParticipante}
                    </span>
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    type="button"
                    onClick={() => eliminarParticipante(participante.id)}
                    title="Eliminar participante"
                  >
                    X
                  </button>
                </div>
              ))}

              {!participantes.length && (
                <div className="alert alert-light mb-0">
                  Agrega participantes para empezar.
                </div>
              )}
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
                    {participanteActivo?.nombre || "Selecciona participante"}
                  </div>
                </div>

                <form
                  className="d-flex align-items-center flex-wrap gap-2 mb-0"
                  onSubmit={agregarCancion}
                >
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: "min(100%, 260px)" }}
                    placeholder="Numero de la cancion"
                    value={numeroCancion}
                    onChange={(e) => setNumeroCancion(e.target.value)}
                    disabled={!participanteActivo || edicionBloqueada || loading}
                  />
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={!participanteActivo || edicionBloqueada || loading}
                  >
                    {loading ? "Agregando..." : "Agregar"}
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
                    Canciones de {participanteActivo?.nombre || "participante"}
                  </h2>
                  <div className="text-muted">
                    {modoConcursoActivo
                      ? "Concurso bloqueado: solo puedes eliminar participantes"
                      : "Edita canciones antes de comenzar"}
                  </div>
                </div>
                <span className="badge bg-secondary">
                  {participanteActivo?.canciones.length || 0}/
                  {cancionesPorParticipante}
                </span>
              </div>

              {participanteActivo ? (
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
                      {participanteActivo.canciones.map((cancion) => (
                        <tr key={cancion._id}>
                          <td>{cancion.numero}</td>
                          <td>{cancion.artista}</td>
                          <td>{cancion.titulo}</td>
                          <td className="text-end">
                            <button
                              className="btn btn-outline-danger btn-sm"
                              type="button"
                              onClick={() => quitarCancion(cancion._id)}
                              disabled={edicionBloqueada}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!participanteActivo.canciones.length && (
                    <div className="alert alert-light mb-0">
                      Este participante aun no tiene canciones.
                    </div>
                  )}
                </div>
              ) : (
                <div className="alert alert-light mb-0">
                  Selecciona o crea un participante.
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
