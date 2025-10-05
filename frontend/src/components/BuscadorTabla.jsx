import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import { jwtDecode } from "jwt-decode";
import PlaylistSelectorModal from "./PlaylistSelectorModal";
import useSocket from "../hooks/useSocket";
import useCola from "../utils/useCola";

const SONG_URL = `${API_URL}/song/numero`;

const BuscadorTabla = () => {
  const [filtroActivo, setFiltroActivo] = useState("titulo");
  const [busqueda, setBusqueda] = useState("");
  const [data, setData] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);

  // ------------------ Autenticación ------------------
  const [userId, setUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.userId);
        setIsAuthenticated(true);
      } catch {}
    }
  }, []);

  // ------------------ Hooks de cola ------------------
  const {
    cola,
    setCola,
    currentIndex,
    setCurrentIndex,
    reproducirCancion,
    insertarEnColaDespuesActual,
  } = useCola();

  // ------------------ Hook de socket ------------------
  const { socket, emitirCola, emitirCambiarCancion } = useSocket(
    userId,
    (index) => {
      console.log("🎵 Canción cambiada remotamente:", index);
      setCurrentIndex(index);
    }
  );

  // ------------------ Fetch canciones ------------------
  const fetchCanciones = async () => {
    try {
      const headers = isAuthenticated
        ? { Authorization: `Bearer ${getToken()}` }
        : {};
      const res = await axios.get(`${SONG_URL}`, { headers });
      setData(res.data.canciones || res.data);
    } catch (err) {
      console.error("Error al obtener canciones", err);
    }
  };

  useEffect(() => {
    fetchCanciones();
  }, [isAuthenticated]);

  const filtrar = (fila) => {
    const valor =
      filtroActivo === "generos"
        ? fila.generos?.nombre?.toLowerCase() || ""
        : fila[filtroActivo]?.toString().toLowerCase() || "";
    return valor.includes(busqueda.toLowerCase());
  };

  const datosFiltrados = data.filter(filtrar);

  // ------------------ Funciones de acción ------------------
  const handlePlay = (index) => {
    reproducirCancion(index, emitirCambiarCancion);
    alert(`🎵 Reproduciendo: ${data[index].titulo}`);
  };

  const agregarAFavoritos = async (songId) => {
    if (!isAuthenticated) return alert("Inicia sesión para usar favoritos");
    try {
      await axios.post(
        `${API_URL}/t/favoritos/add`,
        { songId },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      alert("Canción agregada a favoritos ✅");
    } catch (err) {
      console.error(err);
      alert("No se pudo agregar a favoritos ❌");
    }
  };

  const agregarACola = async (song) => {
    if (!isAuthenticated) return alert("Inicia sesión para agregar a cola");
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/t/cola/add`,
        { userId, songId: song._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Insertar en cola local y emitir socket
      insertarEnColaDespuesActual(song, emitirCola);

      alert("🎵 Canción agregada a la cola ✅");
    } catch (err) {
      console.error(err);
      alert("No se pudo agregar a la cola ❌");
    }
  };

  const handleOpenModal = (songId) => {
    if (!isAuthenticated) return alert("Inicia sesión para agregar a playlist");
    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  return (
    <div>
      {/* Filtros y búsqueda */}
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
              ? "Género"
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
        />
      </div>

      {/* Tabla de canciones */}
      <div style={{ maxHeight: "600px", overflowY: "scroll" }}>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cantante</th>
              <th>Canción</th>
              <th>Género</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {datosFiltrados.map((fila, index) => (
              <tr key={fila._id}>
                <td>{fila.numero}</td>
                <td>{fila.artista}</td>
                <td>{fila.titulo}</td>
                <td>{fila.generos?.nombre || "Sin género"}</td>
                <td>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handlePlay(index)}
                    >
                      <img src="./play.png" alt="" width="40px" />
                    </button>
                    <button
                      className="btn btn-info btn-sm"
                      onClick={() => agregarACola(fila)}
                    >
                      <img src="./mas.png" alt="" width="40px" />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleOpenModal(fila._id)}
                    >
                      <img src="./heart.png" alt="" width="40px" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de playlists */}
      {isAuthenticated && (
        <PlaylistSelectorModal
          show={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          userId={userId}
          songId={selectedSongId}
        />
      )}
    </div>
  );
};

export default BuscadorTabla;
