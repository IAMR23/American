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
import { useBackground } from "../hooks/BackgroundContext";
import ForgotPassword from "./ForgotPassword";
import WhatsAppButton from "../components/WhatsAppButton";
import User from "./User";
import { useSocketContext } from "../hooks/SocketContext";

export default function Home() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("video");
  const [shouldFullscreen, setShouldFullscreen] = useState(false);
  const [user, setUser] = useState(null);
  const [modoCalificacion, setModoCalificacion] = useState(false);
  const [auth, setAuth] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [colaDefault, setColaDefault] = useState([]);
  const [token, setToken] = useState(getToken());
  const [roomId, setRoomId] = useState(null);

  // ✅ NUEVO: evita cambiar la canción directo desde Home
  const [requestedIndex, setRequestedIndex] = useState(null);

  const { background } = useBackground();
  const { connectSocket } = useSocketContext();

  const { cola, currentIndex, setCola, changeSong, clearQueue } =
    useQueueContext();

  const { playlistsPropia, suscrito } = usePlaylists(userId);

  const MIN_ANTERIORES = 2;

  const getColaVisible = () => {
    const esColaDefault = !cola.length || currentIndex >= cola.length;

    if (esColaDefault) return [];

    const start =
      currentIndex - MIN_ANTERIORES > 0 ? currentIndex - MIN_ANTERIORES : 0;

    return cola
      .map((c, i) => ({ cancion: c, index: i }))
      .slice(start)
      .filter((item) => item.cancion && item.cancion._id);
  };

  // ✅ Validar token una sola vez
  useEffect(() => {
    const currentToken = getToken();

    if (!currentToken) {
      setAuth(false);
      return;
    }

    try {
      const decodedToken = jwtDecode(currentToken);

      if (decodedToken.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        setAuth(false);
        setUserId(null);
        setUserRole(null);
      } else {
        setAuth(true);
        setUserId(decodedToken.userId);
        setUserRole(decodedToken.rol);
      }
    } catch (error) {
      console.error("Error al decodificar el token", error);
      localStorage.removeItem("token");
      setAuth(false);
      setUserId(null);
      setUserRole(null);
    }
  }, []);

  const getUser = async (id) => {
    if (!id) return null;

    try {
      const currentToken = getToken();

      if (!currentToken) throw new Error("No hay token disponible");

      const res = await axios.get(`${API_URL}/users/${id}`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      setUser(res.data.user);
      return res.data;
    } catch (err) {
      console.error(
        "Error al traer usuario:",
        err.response?.data || err.message
      );
      return null;
    }
  };

  useEffect(() => {
    if (userId) {
      getUser(userId);
    }
  }, [userId]);

  // ✅ Cargar videos por defecto una sola vez
  useEffect(() => {
    const fetchDefaultVideos = async () => {
      try {
        const res = await axios.get(`${API_URL}/song/default`);
        console.log("✅ Videos por defecto cargados:", res.data.length);
        setColaDefault(res.data || []);
      } catch (err) {
        console.error("❌ Error al cargar videos por defecto:", err);
      }
    };

    fetchDefaultVideos();
  }, []);

  // ✅ Verificar suscripción solo cuando cambie auth/token
  useEffect(() => {
    const currentToken = getToken();

    if (!currentToken) {
      setIsSubscribed(false);
      return;
    }

    const verificarSuscripcion = async () => {
      try {
        const res = await axios.get(`${API_URL}/user/suscripcion`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });

        const { suscrito, subscriptionEnd } = res.data;
        const ahora = new Date();
        const fin = new Date(subscriptionEnd);

        setIsSubscribed(Boolean(suscrito && ahora <= fin));
      } catch (error) {
        console.error("Error al verificar suscripción:", error);
        setIsSubscribed(false);
      }
    };

    verificarSuscripcion();
  }, [auth, token]);

  useEffect(() => {
    if (user === null) return;

    if (user.rol === "admin") return;

    const vigente =
      user.suscrito &&
      user.subscriptionEnd &&
      new Date(user.subscriptionEnd) > new Date();

    if (!vigente) {
      setSeccionActiva("suscribir");
    } else {
      setSeccionActiva("video");
    }
  }, [user]);

  // ✅ Crear sala una sola vez o cuando cambie conexión relevante
  useEffect(() => {
    const crearSala = async () => {
      try {
        let savedRoomId = localStorage.getItem("roomId");

        if (!savedRoomId) {
          const res = await fetch(`${API_URL}/room/create-room`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: "HOST" }),
          });

          const data = await res.json();
          savedRoomId = data.roomId;
          localStorage.setItem("roomId", savedRoomId);
        }

        setRoomId(savedRoomId);
        connectSocket({ roomId: savedRoomId, user: "HOST" });
      } catch (error) {
        console.error("Error al crear/conectar sala:", error);
      }
    };

    crearSala();
  }, [connectSocket]);

  const getColaActual = () => {
    const esColaVacia = !cola.length || currentIndex >= cola.length;
    return esColaVacia ? colaDefault : cola;
  };

  const handleLoginSuccess = async () => {
    const currentToken = getToken();

    if (currentToken) {
      try {
        const decoded = jwtDecode(currentToken);

        setToken(currentToken);
        setUserId(decoded.userId);
        setUserRole(decoded.rol);
        setCola([]);
        setAuth(true);
      } catch (err) {
        console.error("Token inválido", err);
      }
    }

    setSeccionActiva("video");
  };

  const cerrarSesion = async () => {
    try {
      const currentToken = getToken();

      if (currentToken) {
        await fetch(`${API_URL}/t/cola/remove`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        });
      }
    } catch (err) {
      console.error("Error al eliminar la cola:", err);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("roomId");

    setToken(null);
    setUserId(null);
    setUserRole(null);
    setCola([]);
    setAuth(false);
    setUser(null);
    setRoomId(null);
    setRequestedIndex(null);
    setSeccionActiva("video");
  };

  // ✅ CAMBIO IMPORTANTE:
  // Ya no cambia directo con changeSong(index).
  // Primero manda requestedIndex al VideoPlayer.
  const handleCambiarCancion = (index) => {
    setRequestedIndex(index);
  };

  const limpiarCola = () => {
    clearQueue();
    setRequestedIndex(null);
  };

  const handleRegisterSuccess = () => {
    setSeccionActiva("suscribir");
  };

  const renderContenido = () => {
    switch (seccionActiva) {
      case "buscador":
        return <BuscadorTabla onSelectAll={() => setSeccionActiva("video")} />;

      case "favoritos":
        return (
          <FavoritePlaylist
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
        return (
          <LoginForm
            setToken={setToken}
            onLoginSuccess={handleLoginSuccess}
            onGoRegister={() => setSeccionActiva("registrar")}
            onGoPasswordReset={() => setSeccionActiva("password")}
          />
        );

      case "registrar":
        return <RegistrationForm onRegisterSuccess={handleRegisterSuccess} />;

      case "listadoPdf":
        return <ListadoPDFCanciones />;

      case "password":
        return <ForgotPassword />;

      case "suscribir":
        return <PlantTest />;

      case "ayuda":
        return <AyudaPage />;

      case "Celular":
        return <CelularPage />;

      case "user":
        return <User onGoPasswordReset={() => setSeccionActiva("password")} />;

      case "video":
      default: {
        const esColaDefault = !cola.length || currentIndex >= cola.length;
        const colaActual = getColaActual();

        return (
          <VideoPlayer
            cola={colaActual}
            esColaDefault={esColaDefault}
            modoCalificacion={modoCalificacion}
            currentIndex={currentIndex}
            setCurrentIndex={changeSong}
            requestedIndex={requestedIndex}
            onRequestedIndexHandled={() => setRequestedIndex(null)}
            fullscreenRequested={shouldFullscreen}
            onFullscreenHandled={() => setShouldFullscreen(false)}
            onColaTerminada={() => {
              if (!esColaDefault) {
                clearQueue();
              }
            }}
          />
        );
      }
    }
  };

  return (
    <>
      <div
        className="container-fluid overflow-hidden px-2 px-md-4 py-3 d-flex flex-column justify-content-center align-items-center"
        style={{
          backgroundImage: background ? `url(${background})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
        }}
      >
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

              <button
                onClick={() => setSeccionActiva("user")}
                className="boton0"
              >
                {user.nombre}
              </button>
            </div>
          )}
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

              <button
                disabled={!suscrito}
                onClick={() => setModoCalificacion((prev) => !prev)}
                className={`boto ${modoCalificacion ? "boto-activo" : ""}`}
              >
                <img src="./cal.png" alt="" width={250} />
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

        <div className="m-2">
          <div className="d-flex justify-content-center align-items-center gap-3">
            <h2 className="text-white">Canciones a la cola</h2>

            <div
              className={`cola-canciones ${
                getColaVisible().length > 8 ? "scrollable" : ""
              }`}
            >
              {getColaVisible().map(({ cancion, index }) => (
                <div
                  key={`${cancion._id}-${index}`}
                  onClick={() => {
                    handleCambiarCancion(index);
                    setSeccionActiva("video");
                  }}
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

            <button className="btn" onClick={limpiarCola}>
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

      {!isSubscribed && <WhatsAppButton />}
    </>
  );
}