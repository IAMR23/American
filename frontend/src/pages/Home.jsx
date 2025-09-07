import { useState, useEffect } from "react";
import axios from "axios";
import {jwtDecode} from "jwt-decode";
import io from "socket.io-client";
import VideoPlayer from "../components/VideoPlayer";
import { FaCompactDisc } from "react-icons/fa";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";

export default function Home() {
  const [cola, setCola] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userId, setUserId] = useState(null);
  const [socket, setSocket] = useState(null);

  // Inicializar usuario y socket
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      setUserId(decoded.userId);

      const newSocket = io(API_URL);
      setSocket(newSocket);

      // Unirse a la sala del usuario
      newSocket.emit("join", decoded.userId);

      // Escuchar cambios de canción desde otros dispositivos
      newSocket.on("cambiarCancionCliente", (index) => {
        setCurrentIndex(index);
      });

      // Escuchar actualizaciones de la cola desde otros dispositivos
      newSocket.on("colaActualizada", (colaActualizada) => {
        setCola(colaActualizada.filter((c) => c && c._id));
      });

      return () => newSocket.disconnect();
    } catch (err) {
      console.error("Token inválido", err);
    }
  }, []);

  // Cargar cola inicial desde API
  useEffect(() => {
    cargarCola();
  }, []);

  const cargarCola = async () => {
    try {
      const res = await axios.get(`${API_URL}/song/visibles`);
      const canciones = res.data.canciones || res.data;
      setCola(canciones);
      setCurrentIndex(0);
    } catch (err) {
      console.error("Error cargando cola", err);
    }
  };

  // Cambiar canción actual y sincronizar
  const reproducirCancion = (index) => {
    setCurrentIndex(index);

    if (socket && userId) {
      socket.emit("cambiarCancion", { userId, index });
    }
  };

  // Agregar canción a la cola y sincronizar
  const agregarCancion = async (songId) => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/song/${songId}`);
      const nuevaCancion = res.data;

      const nuevaCola = [...cola];
      nuevaCola.splice(currentIndex + 1, 0, nuevaCancion);
      setCola(nuevaCola);

      // Emitir al backend para sincronizar con otros dispositivos
      if (socket && userId) {
        socket.emit("actualizarCola", { userId, nuevaCola, indexActual: currentIndex });
      }

      // Guardar en backend
      await axios.post(
        `${API_URL}/t/cola/add`,
        { songId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("🎵 Canción agregada correctamente");
    } catch (err) {
      console.error(err);
      alert("No se pudo agregar la canción");
    }
  };

  return (
    <div className="container">
      <h1>Karaoke</h1>

      <VideoPlayer
        cola={cola}
        currentIndex={currentIndex}
        setCurrentIndex={reproducirCancion}
      />

      <div className="cola">
        <h2>Cola de Canciones</h2>
        {cola.map((cancion, idx) => (
          <div
            key={cancion._id}
            onClick={() => reproducirCancion(idx)}
            style={{
              cursor: "pointer",
              fontWeight: idx === currentIndex ? "bold" : "normal",
            }}
          >
            <FaCompactDisc /> {cancion.titulo} - {cancion.artista}
          </div>
        ))}
      </div>
    </div>
  );
}
