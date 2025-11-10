import { useState, useEffect } from "react";
import "../styles/inicial.css";
import "../styles/button.css";
import "../styles/disco.css";
import { FaCompactDisc } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import axios from "axios";

import AnunciosVisibles from "../components/AnunciosVisibles";
import VideoPlayer from "../components/VideoPlayer";
import FavoritePlaylist from "../components/FavoritePlaylist";
import PlaylistSugeridos from "./PlaylistSugeridos";
import SolicitudesCancion from "./SolicitudCancion";
import LoginForm from "../components/LoginForm";
import RegistrationForm from "../components/RegistrationForm";
import ListadoPDFCanciones from "../components/ListadoPDFCanciones";
import AyudaPage from "./AyudaPage";
import PlantTest from "../components/PlanTest";
import BuscadorTabla from "../components/BuscadorTabla";

import { getToken } from "../utils/auth";
import { jwtDecode } from "jwt-decode";
import usePlaylists from "../utils/usePlaylists";
import CelularPage from "./CelularPage";
import { useQueueContext } from "../hooks/QueueProvider";
import VideoCarousel from "../components/VideoCarousel";
import VideoCarouselVisibles from "../components/VideoCarouselVisibles";

export default function Inicial() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("video");
  const [shouldFullscreen, setShouldFullscreen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [user, setUser] = useState(null);

  // ------------------ Hooks personalizados ------------------

  const { cola, currentIndex, setCola, setCurrentIndex, emitirCambiarCancion } =
    useQueueContext();

  const MIN_ANTERIORES = 2;

  const getColaVisible = () => {
    const start =
      currentIndex - MIN_ANTERIORES > 0 ? currentIndex - MIN_ANTERIORES : 0;
    const visibles = cola.slice(start);
    return visibles.filter((c) => c && c._id);
  };

  const { playlists, playlistsPropia, suscrito, handleAddPlaylist } =
    usePlaylists(userId);

  // ------------------ Manejo de token ------------------
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      setUserId(decoded.userId);
      setUserRole(decoded.rol);
    } catch (err) {
      console.error("Token inválido", err);
    }
  });

  // 2️⃣ Cuando userId cambie, trae el usuario
  useEffect(() => {
    if (userId) {
      getUser(userId);
    }
  }, [userId]);

  const [colaDefault, setColaDefault] = useState([]);
  const [esColaDefault, setEsColaDefault] = useState(false);

  useEffect(() => {
    const fetchDefaultVideos = async () => {
      const res = await axios.get(`${API_URL}/song/default`);
      setColaDefault(res.data);
    };
    fetchDefaultVideos();
  }, []);

  const getColaActual = () => {
    const esColaVacia = !cola.length || currentIndex >= cola.length;
    return esColaVacia ? colaDefault : cola;
  };

  const handleLoginSuccess = async () => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.userId);
        setUserRole(decoded.rol);
        // LIMPIAR LA COLA AL HACER LOGIN
        setCola([]);
        setCurrentIndex(0);

        console.log("Cola limpiada después del login");
      } catch (err) {
        console.error("Token inválido", err);
      }
    }
    setSeccionActiva("video");
  };
  const cerrarSesion = async () => {
    try {
      const token = getToken();
      if (token) {
        await fetch(`${API_URL}/t/cola/remove`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error("Error al eliminar la cola:", err);
    }

    localStorage.removeItem("token");
    setUserId(null);
    setUserRole(null);
    setCola([]);
    setCurrentIndex(0);
    // Recarga la página
    window.location.reload();
  };

  // Función mejorada para cambiar canción con sincronización
  const handleCambiarCancion = (index) => {
    setCurrentIndex(index);
    emitirCambiarCancion(index);
  };

  const limpiarCola = async () => {
    try {
      const token = getToken();
      if (token) {
        await axios.delete(`${API_URL}/t/cola/remove`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        setCola([]);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error("Error al eliminar la cola:", err);
    }
  };

  const getUser = async (userId) => {
    if (!userId) return null; // Evita peticiones innecesarias

    try {
      const token = getToken();
      if (!token) throw new Error("No hay token disponible");

      const res = await axios.get(`${API_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(res.data.user);
      return res.data; // contiene nombre, correo, rol, etc.
    } catch (err) {
      console.error(
        "Error al traer usuario:",
        err.response?.data || err.message
      );
      return null;
    }
  };

  const renderContenido = () => {
    switch (seccionActiva) {
      case "buscador":
        return <BuscadorTabla onSelectAll={() => setSeccionActiva("video")} />;
      case "favoritos":
        return (
          <FavoritePlaylist
            // playlists={playlists}
            userId={userId}      
            onSelectAll={() => setSeccionActiva("video")}
          />
        );
      case "playlist":
        return (
          <PlaylistSugeridos
            playlists={playlistsPropia}
            onSelectAll={() => setSeccionActiva("video")}
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
      case "suscribir":
        return <PlantTest />;
      case "ayuda":
        return <AyudaPage />;
      case "Celular":
        return <CelularPage />;
      case "video":
      default:
        return (
          <VideoPlayer
            cola={getColaActual()}
            currentIndex={currentIndex}
            setCurrentIndex={handleCambiarCancion}
            fullscreenRequested={shouldFullscreen}
            onFullscreenHandled={() => setShouldFullscreen(false)}
            onColaTerminada={() => {
              // ⚡ Cuando se acaba la cola, usar los videos por defecto
              setCola(colaDefault);
              setCurrentIndex(0);
              setEsColaDefault(true);
            }}
          />
        );
    }
  };

  return (
    <>
      <div className="bg-primary container-fluid overflow-hidden px-2 px-md-4 py-3 d-flex flex-column justify-content-center align-items-center">
        {/* Header */}
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
          {user && user.nombre && (
            <div
              className="m-2 pt-4 d-flex justify-content-center align-items-center flex-column"
              style={{
                position: "absolute",
                right: "20px",
                margin: 0,
                color: "white",
              }}
            >
              <div>
                <h3 className="outlined-black">Bienvenido:</h3>
              </div>

              <button className="boton0">{user.nombre}</button>
            </div>
          )}
        </div>

        {/* Botones laterales y contenido */}
        <div className="container-fluid">
          <div className="row">
            {/* Lateral izquierda */}
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
                disabled={!suscrito}
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
              <button
                className="boton2"
                onClick={() => setSeccionActiva("Celular")}
                disabled={!suscrito}
              >
                Celular
              </button>
            </div>

            {/* Contenido central */}
            <div className="col-12 col-md-8 justify-content-center">
              {renderContenido()}
            </div>

            {/* Lateral derecha */}
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

        <div className="m-2 ">
          <div className="d-flex justify-content-center align-items-center gap-3">
            <h2 className="text-white">Canciones a la cola</h2>
            <div
              className={`cola-canciones ${
                getColaVisible().length > 8 ? "scrollable" : ""
              }`}
            >
              {getColaVisible().map((cancion, idx) => {
                const indexReal =
                  currentIndex - 2 > 0 ? idx + (currentIndex - 2) : idx;
                return (
                  <div
                    key={indexReal}
                    onClick={() => {
                      handleCambiarCancion(indexReal);
                      setSeccionActiva("video");
                    }}
                    className="song-icon position-relative"
                    style={{ cursor: "pointer" }}
                  >
                    <FaCompactDisc
                      size={40}
                      className={`mb-1 ${
                        indexReal === currentIndex
                          ? "song-playing"
                          : "text-primary"
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
            <button
              className="btn "
              onClick={() => {
                limpiarCola();
              }}
            >
              <img className="m-2" src="/limpiar.png" alt="" width={120} />
            </button>
          </div>
        </div>
      </div>

      <div className="fondo p-2">
        <AnunciosVisibles />
        <h1 className="p-2 text-white">Selección especial</h1>
        <VideoCarouselVisibles />
        <h1 className="p-2 text-white">Las más populares</h1>
        <VideoCarousel />
      </div>
    </>
  );
}
