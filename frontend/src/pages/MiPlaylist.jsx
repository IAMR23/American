import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

const MiPlaylist = () => {
  const { id } = useParams();
  const [canciones, setCanciones] = useState([]);
  const [todasLasCanciones, setTodasLasCanciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [busqueda, setBusqueda] = useState(""); // estado para el filtro
  const [nombrePlaylist, setNombrePlaylist] = useState("");

  useEffect(() => {
    fetchCancionesDePlaylist();
  }, [id]);

  const fetchCancionesDePlaylist = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/t2/playlistpropia/canciones/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCanciones(response.data.canciones || []);
      setNombrePlaylist(response.data.nombre || ""); // 👈 aquí guardamos el nombre
    } catch (err) {
      console.error("Error al obtener canciones:", err);
      setError("No se pudieron cargar las canciones");
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/song`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTodasLasCanciones(response.data || []);
      setBusqueda(""); // limpio el filtro cada vez que abro
      setMostrarModal(true);
    } catch (err) {
      console.error("Error al cargar todas las canciones:", err);
    }
  };

  const agregarCancionAPlaylist = async (cancionId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/t2/playlistpropia/${id}/addsong`,
        { songId: cancionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchCancionesDePlaylist();
    } catch (err) {
      console.error("Error al agregar canción:", err);
      alert("No se pudo agregar la canción");
    }
  };

  const eliminarCancionDePlaylist = async (cancionId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_URL}/t2/playlistpropia/${id}/remove/${cancionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      fetchCancionesDePlaylist(); // actualizar lista
    } catch (err) {
      console.error("Error al eliminar canción:", err);
      alert("No se pudo eliminar la canción");
    }
  };

  // Función para filtrar canciones por título o artista según búsqueda
  const cancionesFiltradas = todasLasCanciones.filter((cancion) => {
    const texto = busqueda.toLowerCase();
    return (
      cancion.titulo.toLowerCase().includes(texto) ||
      cancion.artista.toLowerCase().includes(texto)
    );
  });

  return (
    <div>
      <h1>Playlist: {nombrePlaylist || "Cargando..."}</h1>

      <button className="btn btn-primary my-3" onClick={abrirModal}>
        Agregar Canciones
      </button>

      {loading ? (
        <p>Cargando canciones...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : canciones.length === 0 ? (
        <p>No hay canciones en esta playlist.</p>
      ) : (
        <ul className="list-group">
          {canciones.map((cancion) => (
            <li
              key={cancion._id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <span>
                {cancion.artista} - {cancion.titulo}
              </span>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => eliminarCancionDePlaylist(cancion._id)}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Modal */}
      {mostrarModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Agregar Canciones</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMostrarModal(false)}
                ></button>
              </div>
              <div
                className="modal-body"
                style={{ maxHeight: "400px", overflowY: "auto" }}
              >
                {/* Input para búsqueda */}
                <input
                  type="text"
                  placeholder="Buscar canción o artista..."
                  className="form-control mb-3"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  autoFocus
                />

                {cancionesFiltradas.length === 0 ? (
                  <p>No se encontraron canciones.</p>
                ) : (
                  cancionesFiltradas.map((cancion) => (
                    <div
                      key={cancion._id}
                      className="d-flex justify-content-between align-items-center border-bottom py-2"
                    >
                      <span>
                        {cancion.titulo} - {cancion.artista}
                      </span>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => agregarCancionAPlaylist(cancion._id)}
                      >
                        Agregar
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setMostrarModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiPlaylist;
