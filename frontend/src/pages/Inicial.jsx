import { useState, useEffect } from "react";
import "../styles/inicial.css";
import AnunciosVisibles from "../components/AnunciosVisibles";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../styles/button.css";
import "../styles/disco.css";
import VideoPlayer from "../components/VideoPlayer";
import { FaCompactDisc } from "react-icons/fa";
import PlaylistSelector from "../components/PlaylistSelector";
import PlaylistSugeridos from "./PLaylistSugeridos";
import { useNavigate } from "react-router-dom";
import SolicitudesCancion from "./SolicitudCancion";
import LoginForm from "../components/LoginForm";
import ListadoPDFCanciones from "../components/ListadoPDFCanciones";
import AyudaPage from "./AyudaPage";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import PlantTest from "../components/PlanTest";
import Carrousel from "../components/Carrousel";
import BuscadorTabla from "../components/BuscadorTabla";
import RegistrationForm from "../components/RegistrationForm";
import MasReproducidas from "../components/MasReproducidas";
import UltimasSubidas from "../components/UltimasSubidas";
import io from "socket.io-client";

export default function Inicial() {
  const [cola, setCola] = useState([]);
  const [userId, setUserId] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsPropia, setPlaylistsPropia] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [suscrito, setSuscrito] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modoReproduccion, setModoReproduccion] = useState("cola"); // "cola" o "playlist"
  const [playlistActualId, setPlaylistActualId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [shouldFullscreen, setShouldFullscreen] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState("video");
  const [socket, setSocket] = useState(null);

  const navigate = useNavigate();
  const MIN_ANTERIORES = 2;

  // FUNCIONES UTILES
  const getColaVisible = () => {
    const start =
      currentIndex - MIN_ANTERIORES > 0 ? currentIndex - MIN_ANTERIORES : 0;
    const visibles = cola.slice(start);
    return visibles.filter((c) => c && c._id);
  };

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

    // Cambiar canción actual y sincronizar
  const reproducirCancion = (index) => {
    setCurrentIndex(index);

    if (socket && userId) {
      socket.emit("cambiarCancion", { userId, index });
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    setUserId(null);
    window.location.reload();
  };

  const insertarEnColaDespuesActual = (nuevaCancion) => {
    if (!nuevaCancion || !nuevaCancion._id) return;

    setCola((prevCola) => {
      const index =
        currentIndex !== undefined ? currentIndex : prevCola.length - 1;
      const nuevaCola = [...prevCola];
      nuevaCola.splice(index + 1, 0, nuevaCancion);
      return nuevaCola;
    });
  };

  // CARGA INICIAL DE TOKEN Y DATOS
  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.userId);
        setUserRole(decoded.rol);
      } catch (err) {
        console.error("Token inválido", err);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    cargarTodo(userId);
    cargarCola();
  }, [userId]);

  const cargarTodo = async (userId) => {
    const token = getToken();
    if (!token) return;

    try {
      const resPlaylists = await axios.get(`${API_URL}/t/playlist/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlaylists(Array.isArray(resPlaylists.data) ? resPlaylists.data : []);

      const resPropia = await axios.get(`${API_URL}/t2/playlistPropia`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlaylistsPropia(Array.isArray(resPropia.data) ? resPropia.data : []);

      const resSub = await axios.get(`${API_URL}/user/suscripcion`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuscrito(resSub.data.suscrito === true);
    } catch (error) {
      console.error("Error cargando datos", error);
    }
  };

  const cargarCola = async () => {
    try {
      const res = await axios.get(`${API_URL}/song/visibles`);
      const canciones = res.data.canciones || res.data;
      if (Array.isArray(canciones)) {
        setCola(canciones);
        setCurrentIndex(0);
        setModoReproduccion("cola");
      }
    } catch (err) {
      console.error("Error cargando canciones visibles", err);
    }
  };

  // CARGAR PLAYLIST EN COLA
  const cargarPlaylistPropiaACola = async (playlistId) => {
    const token = getToken();
    try {
      const res = await axios.get(
        `${API_URL}/t2/playlistPropia/canciones/${playlistId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const canciones = res.data.canciones || [];
      setCola(canciones);
      setCurrentIndex(0);
      setModoReproduccion("playlist");
      setPlaylistActualId(playlistId);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarPlaylistACola = async (playlistId) => {
    const token = getToken();
    try {
      const res = await axios.get(
        `${API_URL}/t/playlist/canciones/${playlistId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const canciones = res.data.canciones || [];
      setCola(canciones);
      setCurrentIndex(0);
      setModoReproduccion("playlist");
      setPlaylistActualId(playlistId);
    } catch (err) {
      console.error(err);
    }
  };

  // INSERTAR CANCION
  const insertarCancion = async (songId) => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/song/${songId}`);
      const nuevaCancion = res.data;

      if (modoReproduccion === "cola") {
        await axios.post(
          `${API_URL}/t/cola/add`,
          { songId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      insertarEnColaDespuesActual(nuevaCancion);

      // Emitir a otros clientes
      if (socket) socket.emit("colaActualizada", [...cola, nuevaCancion]);

      alert("🎵 Canción agregada correctamente");
    } catch (err) {
      console.error(err);
      alert("No se pudo agregar la canción");
    }
  };

  const handlePlaySong = (index) => {
    setCurrentIndex(index);
    setSeccionActiva("video");
    setShouldFullscreen(true);

    // Emitir índice a otros clientes
    if (socket) socket.emit("playIndex", index);
  };

  // RENDERIZADO DE SECCIONES
  const renderContenido = () => {
    switch (seccionActiva) {
      case "buscador":
        return <BuscadorTabla />;
      case "favoritos":
        return (
          <PlaylistSelector
            playlists={playlists}
            onSelect={(playlist) => {
              setSelectedPlaylist(playlist);
              cargarPlaylistACola(playlist._id);
              setSeccionActiva("video");
              setShowModal(false);
            }}
            onAdd={handleAddPlaylist}
            onClose={() => setShowModal(false)}
          />
        );
      case "playlist":
        return (
          <PlaylistSugeridos
            playlists={playlistsPropia}
            onSelect={(playlist) => {
              setSelectedPlaylist(playlist);
              cargarPlaylistPropiaACola(playlist._id);
              setSeccionActiva("video");
              setShowModal(false);
            }}
            onAdd={handleAddPlaylist}
            onClose={() => setShowModal(false)}
          />
        );
      case "sugerirCanciones":
        return <SolicitudesCancion />;
      case "ingresar":
        return <LoginForm onLoginSuccess={handleLoginSuccess} />;
      case "registrar":
        return <RegistrationForm />;
      case "listadoPdf":
        return <ListadoPDFCanciones />;
      case "calificacion":
        return <MasReproducidas />;
      case "suscribir":
        return <PlantTest />;
      case "ayuda":
        return <AyudaPage />;
      case "video":
      default:
        return (
          <VideoPlayer
            cola={cola}
            currentIndex={currentIndex}
            setCurrentIndex={reproducirCancion}
            fullscreenRequested={shouldFullscreen}
            onFullscreenHandled={() => setShouldFullscreen(false)}
          />
        );
    }
  };

  // CREAR PLAYLIST
  const handleAddPlaylist = async (name) => {
    const token = getToken();
    try {
      const res = await axios.post(
        `${API_URL}/t/playlist`,
        { nombre: name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const nuevaPlaylist = res.data;
      setPlaylists((prev) =>
        Array.isArray(prev) ? [...prev, nuevaPlaylist] : [nuevaPlaylist]
      );
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert("No se pudo crear el playlist. Quizás ya existe.");
    }
  };

  const handleLoginSuccess = async () => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.userId);
        setUserRole(decoded.rol);
        await cargarTodo(decoded.userId);
      } catch (err) {
        console.error("Token inválido", err);
      }
    }
    setSeccionActiva("video");
  };

  return (
    <>
      <div className="bg-primary container-fluid overflow-hidden px-2 px-md-4 py-3 d-flex flex-column justify-content-center align-items-center">
        {/* Encabezado */}
        <div className="d-flex flex-wrap justify-content-center align-items-center w-100 gap-3">
          <img
            src="./icono.png"
            alt="icono"
            style={{ width: "60px", height: "auto" }}
          />
          <img
            onClick={() => setSeccionActiva("video")}
            src="./logo.png"
            alt="logo"
            className="img-fluid"
            style={{
              width: "80%",
              maxWidth: "600px",
              cursor: "pointer",
              minWidth: "250px",
            }}
          />
        </div>

        {/* Botones y contenido */}
        <div className="container-fluid">
          <div className="row">
            <div className="col-12 col-md-2 d-flex flex-column align-items-center justify-content-center gap-1">
              {getToken() && userRole === "admin" && (
                <button
                  className="boton2"
                  onClick={() => navigate("/dashboard")}
                >
                  Dashboard
                </button>
              )}
              <button
                className="boton1"
                onClick={() => setSeccionActiva("buscador")}
                disabled={!suscrito}
              >
                Buscador
              </button>
              <button
                className="boton2"
                onClick={() => setSeccionActiva("playlist")}
                disabled={!suscrito}
              >
                PlayList
              </button>
              <button
                className="boton3"
                onClick={() => navigate("/ultimas-subidas")}
              >
                Lo último
              </button>
              <button
                className="boton4"
                onClick={() => setSeccionActiva("favoritos")}
                disabled={!suscrito}
              >
                Favoritos
              </button>
              <button
                onClick={() => navigate("/listaCanciones")}
                className="boton7"
                disabled={!suscrito}
              >
                Canciones
              </button>
              <button
                className="boton3"
                onClick={() => setSeccionActiva("sugerirCanciones")}
                disabled={!suscrito}
              >
                Sugerir
              </button>
            </div>

            <div className="col-12 col-md-8 justify-content-center">
              {renderContenido()}
            </div>

            <div className="col-12 col-md-2 d-flex flex-column align-items-center justify-content-center gap-1">
              {!getToken() && (
                <>
                  <button
                    className="boton8"
                    onClick={() => setSeccionActiva("ingresar")}
                  >
                    Ingresar
                  </button>
                  <button
                    className="boton7"
                    onClick={() => setSeccionActiva("registrar")}
                  >
                    Registrar
                  </button>
                </>
              )}
              <button
                className="boton9"
                onClick={() => setSeccionActiva("listadoPdf")}
                disabled={!suscrito}
              >
                Listado PDF
              </button>
              <button className="boton10">Calificación</button>
              <button
                className="boton9"
                onClick={() => setSeccionActiva("suscribir")}
              >
                Suscribir
              </button>
              <button
                className="boton1"
                onClick={() => setSeccionActiva("ayuda")}
                disabled={!suscrito}
              >
                Ayuda
              </button>
              <button
                className="boton2"
                onClick={() => navigate("/publicaciones")}
                disabled={!suscrito}
              >
                Galería Otros
              </button>
              {getToken() && (
                <button className="boton3" onClick={cerrarSesion}>
                  Cerrar Sesión
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cola dinámica */}
        <div className="d-flex flex-wrap justify-content-center align-items-center gap-3 m-3">
          <h2 className="text-white">Canciones a la cola </h2>
          {getColaVisible().map((cancion, idx) => {
            const indexReal =
              currentIndex - MIN_ANTERIORES > 0
                ? idx + (currentIndex - MIN_ANTERIORES)
                : idx;
            return (
              <div
                key={indexReal}
                onClick={() => reproducirCancion(indexReal)}
                className="song-icon position-relative"
                style={{ cursor: "pointer" }}
              >
                <FaCompactDisc
                  size={40}
                  className={`mb-1 ${
                    indexReal === currentIndex ? "song-playing" : "text-primary"
                  }`}
                />
                <div className="custom-tooltip">
                  <strong>{cancion.titulo}</strong>
                  <br />
                  <small>{cancion.artista}</small>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sección especial */}
      <div className="fondo p-2">
        <AnunciosVisibles />
        <h1 className="p-2 text-white">Selección especial</h1>
        <Carrousel
          className="bg-dark"
          setCola={setCola}
          cola={cola}
          cargarCola={cargarCola}
          onAgregarCancion={insertarCancion}
          onPlaySong={handlePlaySong}
        />
        <h1 className="p-2 text-white">Las mas populares</h1>
        <MasReproducidas
          setCola={setCola}
          cola={cola}
          cargarCola={cargarCola}
          onAgregarCancion={insertarCancion}
          onPlaySong={handlePlaySong}
        />
      </div>
    </>
  );
}
