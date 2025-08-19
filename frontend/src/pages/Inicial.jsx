import { useState, useEffect } from "react";
import "../styles/inicial.css";
import AnunciosVisibles from "../components/AnunciosVisibles";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
//import "../styles/botones.css";
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

export default function Inicial() {
  const [cola, setCola] = useState([]);
  const [userId, setUserId] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsPropia, setPlaylistsPropia] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [suscrito, setSuscrito] = useState(false);

  // Renderizado
  const [seccionActiva, setSeccionActiva] = useState("video");
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    setSeccionActiva("video");
  };

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
              setSeccionActiva("video"); // 👈 esto lleva al VideoPlayer
              setShowModal(false);
            }}
            onAdd={handleAddPlaylist}
            onClose={() => setShowModal(false)}
          />
        );
      case "ultimo":
        return <MasCantado />;

      case "playlist":
        return (
          <PlaylistSugeridos
            playlists={playlistsPropia}
            onSelect={(playlist) => {
              setSelectedPlaylist(playlist);
              cargarPlaylistPropiaACola(playlist._id);
              setSeccionActiva("video"); // 👈 esto lleva al VideoPlayer
              setShowModal(false);
            }}
            onAdd={handleAddPlaylist}
            onClose={() => setShowModal(false)}
          />
        );

      case "sugerirCanciones":
        return <SolicitudesCancion />;
      case "scanner":
        return <ScannerCelular />;

      case "ingresar":
        return <LoginForm onLoginSuccess={handleLoginSuccess} />;
      case "registrar":
        return <RegistrationForm />;
      case "listadoPdf":
        return <ListadoPDFCanciones />;
      case "calificacion":
        return <MasCantado />;
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
            setCurrentIndex={setCurrentIndex}
            fullscreenRequested={shouldFullscreen}
            onFullscreenHandled={() => setShouldFullscreen(false)} // callback para resetear
          />
        );
    }
  };

  const [currentIndex, setCurrentIndex] = useState(0); // Añadir esto

  const [modoReproduccion, setModoReproduccion] = useState("cola"); // "cola" o "playlist"
  const [playlistActualId, setPlaylistActualId] = useState(null);

  const insertarEnColaDespuesActual = (nuevaCancion) => {
    setCola((prevCola) => {
      const nuevaCola = [...prevCola];
      nuevaCola.splice(currentIndex + 1, 0, nuevaCancion);
      return nuevaCola;
    });
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    setUserId(null);
    navigate("/"); // O recarga la página si prefieres
    window.location.reload(); // Fuerza recarga total si quieres limpiar estados
  };

  // Crear nuevo playlist
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
      console.error(
        "Error al crear playlist:",
        err.response?.data || err.message
      );
      alert("No se pudo crear el playlist. Quizás ya existe.");
    }
  };

  const [userRole, setUserRole] = useState(null);

  // Cargar token y datos del usuario

  // Primer efecto: decodifica y establece userId y rol
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

  // Segundo efecto: una vez userId está listo, carga todo
  useEffect(() => {
    const token = getToken();
    if (!token || !userId) return;

    const cargarDatosAdmin = async () => {
      try {
        const resPlaylistsPropia = await axios.get(
          `${API_URL}/t2/playlistPropia`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setPlaylistsPropia(
          Array.isArray(resPlaylistsPropia.data) ? resPlaylistsPropia.data : []
        );
      } catch (error) {
        console.error("Error al cargar playlists", error);
        setPlaylistsPropia([]);
      }

      try {
        const resSub = await axios.get(`${API_URL}/user/suscripcion`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuscrito(resSub.data.suscrito === true);
      } catch (error) {
        console.warn("No estás suscrito o hubo un error al verificar.");
        setSuscrito(false);
      }

      cargarCola();
    };

    const cargarDatos = async () => {
      try {
        const resPlaylists = await axios.get(
          `${API_URL}/t/playlist/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setPlaylists(Array.isArray(resPlaylists.data) ? resPlaylists.data : []);
      } catch (error) {
        console.error("Error al cargar playlists", error);
        setPlaylists([]);
      }

      try {
        const resSub = await axios.get(`${API_URL}/user/suscripcion`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuscrito(resSub.data.suscrito === true);
      } catch (error) {
        console.warn("No estás suscrito o hubo un error al verificar.");
        setSuscrito(false);
      }

      cargarCola();
    };

    cargarDatos();
    cargarDatosAdmin();
  }, [userId]);

  const cargarPlaylistPropiaACola = async (playlistId) => {
    const token = getToken();
    try {
      const res = await axios.get(
        `${API_URL}/t2/playlistPropia/canciones/${playlistId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const canciones = res.data.canciones || [];
      setCola(canciones);
      setModoReproduccion("playlist");
      setPlaylistActualId(playlistId);
    } catch (err) {
      console.error("Error al cargar canciones del playlist", err);
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
      setModoReproduccion("playlist");
      setPlaylistActualId(playlistId);
    } catch (err) {
      console.error("Error al cargar canciones del playlist", err);
    }
  };

  const insertarCancion = async (songId) => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/song/${songId}`);
      const nuevaCancion = res.data;

      if (modoReproduccion === "cola") {
        await axios.post(
          `${API_URL}/t/cola/add`,
          { songId },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // Inserta localmente en ambos casos
      insertarEnColaDespuesActual(nuevaCancion);
      alert("🎵 Canción agregada correctamente");
    } catch (err) {
      console.error("Error al insertar canción", err);
      alert("No se pudo agregar la canción");
    }
  };

  const cargarCola = async () => {
    const token = getToken();
    if (!token || !userId) return;
    try {
      const res = await axios.get(`${API_URL}/t/cola/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCola(res.data?.canciones || []);
      setModoReproduccion("cola");
      setPlaylistActualId(null);
    } catch (error) {
      console.error("Error al cargar la cola", error);
    }
  };

  const [shouldFullscreen, setShouldFullscreen] = useState(false);

  const handlePlaySong = (index) => {
    setCurrentIndex(index);
    setSeccionActiva("video"); // para asegurarse de mostrar el reproductor
    setShouldFullscreen(true); // activar fullscreen en VideoPlayer
  };

  return (
    <>
      <div className="fondo container-fluid  overflow-hidden px-2 px-md-4 py-3 d-flex flex-column justify-content-center align-items-center">
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
              width: "80%", // 80% en móviles
              maxWidth: "600px", // máximo ancho en pantallas grandes
              cursor: "pointer",
              minWidth: "250px", // mínimo ancho para que no se vea muy pequeño en tablets
            }}
          />
        </div>
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
                onClick={() => setSeccionActiva("ultimo")}
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
              {/* <button className="boton7">Scanner a Celular</button> */}
            </div>

            <div className="col-12 col-md-8   justify-content-center">
              {renderContenido()}
            </div>

            <div className="col-12 col-md-2 d-flex flex-column align-items-center justify-content-center gap-1">
              <div className="container-fluid"></div>
              {!getToken() && (
                <button
                  className="boton8"
                  onClick={() => setSeccionActiva("ingresar")}
                >
                  Ingresar
                </button>
              )}
              {!getToken() && (
                <button
                  className="boton7"
                  onClick={() => setSeccionActiva("registrar")}
                >
                  Registrar
                </button>
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

        <div className="d-flex flex-wrap justify-content-center align-items-center  gap-3 m-3">
          <h2 className="text-white">Canciones a la cola </h2>
          {cola.map((cancion, index) => (
            <div
              key={index}
              onClick={() => setCurrentIndex(index)}
              className="song-icon position-relative"
              style={{ cursor: "pointer" }}
            >
              <FaCompactDisc
                size={40}
                className={`mb-1 ${
                  index === currentIndex ? "song-playing" : "text-primary"
                }`}
              />
              <div className="custom-tooltip">
                <strong>{cancion.titulo}</strong>
                <br />
                <small>{cancion.artista}</small>
              </div>
            </div>
          ))}
        </div>

        <AnunciosVisibles />
      </div>

      <div className=" fondo p-2">
        <h1 className="p-2 text-white">Selección especial</h1>

        <Carrousel
          className="bg-dark"
          setCola={setCola}
          cola={cola}
          cargarCola={cargarCola} // puedes ajustar si necesitas recargar desde hijo
          onAgregarCancion={insertarCancion}
          onPlaySong={handlePlaySong} // <-- Nuevo prop
        />
      </div>

      <div className=" fondo p-2">
        <h1 className="p-2 text-white">Las mas populares</h1>

        <Carrousel
          setCola={setCola}
          cola={cola}
          cargarCola={cargarCola} // puedes ajustar si necesitas recargar desde hijo
          onAgregarCancion={insertarCancion}
          onPlaySong={handlePlaySong} // <-- Nuevo prop
        />
      </div>
    </>
  );
}
