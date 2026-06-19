import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import "../styles/inicial.css";
import { FaCompactDisc } from "react-icons/fa";
import Logo from "../components/Logo";
import { getToken } from "../utils/auth";

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
      const token = getToken();

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
      <div className="fondo container-fluid  ">
      <Logo/>
        <div>
          <h1 className="text-white">
            Playlist: {nombrePlaylist || "Cargando..."}
          </h1>

          {loading ? (
            <p>Cargando canciones...</p>
          ) : error ? (
            <p style={{ color: "red" }}>{error}</p>
          ) : canciones.length === 0 ? (
            <p>No hay canciones en esta playlist.</p>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              {canciones.map((cancion, idx) => (
                <div
                  key={cancion._id}
                  onClick={() => handleCambiarCancion(idx)}
                  style={{
                    cursor: "pointer",
                    textAlign: "center",
                    width: "100px",
                    color : "blue"
                  }}
                >
                  <FaCompactDisc
                    size={50}
                    
                  />
                  <div style={{ fontSize: "0.8rem", marginTop: "0.3rem" , color:"white" }}>
                    <strong >{cancion.titulo}</strong>
                    <br />
                    <small>{cancion.artista}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MiPlaylistUser;
