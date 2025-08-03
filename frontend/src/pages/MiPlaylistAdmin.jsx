import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import "../styles/inicial.css";

const MiPlaylistUser = () => {
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
        `${API_URL}/t2/playlistPropia/canciones/${id}`,
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

  // Función para filtrar canciones por título o artista según búsqueda
  const cancionesFiltradas = todasLasCanciones.filter((cancion) => {
    const texto = busqueda.toLowerCase();
    return (
      cancion.titulo.toLowerCase().includes(texto) ||
      cancion.artista.toLowerCase().includes(texto)
    );
  });

  return (
    <>
      <div className="fondo container-fluid  overflow-hidden px-2 px-md-4 py-3 d-flex flex-column justify-content-center align-items-center">
        <div className="d-flex flex-wrap justify-content-center align-items-center w-100 gap-3">
          <img
            src="/icono.png"
            alt="icono"
            style={{ width: "60px", height: "auto" }}
          />
          <img
            onClick={() => setSeccionActiva("video")}
            src="/logo.png"
            alt="logo"
            className="img-fluid"
            style={{
              width: "80%", // 80% en móviles
              maxWidth: "600px", // máximo ancho en pantallas grandes
              cursor: "pointer",
              minWidth: "250px", // mínimo ancho para que no se vea muy pequeño en tablets
            }}
          />
        </div>
        <div>
          <h1 className="text-white">Playlist: {nombrePlaylist || "Cargando..."}</h1>

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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default MiPlaylistUser;
