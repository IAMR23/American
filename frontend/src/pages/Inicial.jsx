import { useState, useEffect } from "react";
import "../styles/inicial.css";
import "../styles/button.css";
import "../styles/disco.css";
import { FaCompactDisc } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";

import AnunciosVisibles from "../components/AnunciosVisibles";
import VideoPlayer from "../components/VideoPlayer";
import PlaylistSelector from "../components/PlaylistSelector";
import PlaylistSugeridos from "./PLaylistSugeridos";
import SolicitudesCancion from "./SolicitudCancion";
import LoginForm from "../components/LoginForm";
import RegistrationForm from "../components/RegistrationForm";
import ListadoPDFCanciones from "../components/ListadoPDFCanciones";
import AyudaPage from "./AyudaPage";
import PlantTest from "../components/PlanTest";
import Carrousel from "../components/Carrousel";
import BuscadorTabla from "../components/BuscadorTabla";
import MasReproducidas from "../components/MasReproducidas";

import { getToken } from "../utils/auth";
import { jwtDecode } from "jwt-decode";

import useSocket from "../utils/useSocket";
import useCola from "../utils/useCola";
import usePlaylists from "../utils/usePlaylists";
import CelularPage from "./CelularPage";

export default function Inicial() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("video");
  const [shouldFullscreen, setShouldFullscreen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  // ------------------ Hooks personalizados ------------------
  const {
    cola,
    setCola,
    currentIndex,
    setCurrentIndex,
    modoReproduccion,
    setModoReproduccion,
    getColaVisible,
    cargarCola,
    reproducirCancion,
    insertarEnColaDespuesActual,
  } = useCola();

  const { playlists, playlistsPropia, suscrito, handleAddPlaylist } =
    usePlaylists(userId);

  const { socket, emitirCola, emitirCambiarCancion } = useSocket(
    userId,
    (colaActualizada) => {
      console.log("CP1", colaActualizada);
      setCola(colaActualizada.filter((c) => c && c._id));
    },
    (index) => setCurrentIndex(index)
  );

  // ------------------ Manejo de token ------------------
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      setUserId(decoded.userId);
      setUserRole(decoded.rol);
      console.log("Usuario autenticado:", decoded.userId);
    } catch (err) {
      console.error("Token inválido", err);
    }
  }, []);

  // ------------------ Cargar cola inicial ------------------
  useEffect(() => {
    const token = getToken();
    if (!token) cargarCola();
  }, []);

  // ------------------ Funciones ------------------
  const handleLoginSuccess = async () => {
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
    setSeccionActiva("video");
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    setUserId(null);
    setUserRole(null);
    window.location.reload();
  };

  const handlePlaySong = (index) => {
    reproducirCancion(index, emitirCambiarCancion);
    setSeccionActiva("video");
    setShouldFullscreen(true);
  };

  const insertarCancion = async (songId) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/song/${songId}`);
      const nuevaCancion = await res.json();

      if (modoReproduccion === "cola") {
        await fetch(`${API_URL}/t/cola/add`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ songId }),
        });
      }

      insertarEnColaDespuesActual(nuevaCancion, emitirCola);
      console.log("CP");
      alert("🎵 Canción agregada correctamente");
    } catch (err) {
      console.error(err);
      alert("No se pudo agregar la canción");
    }
  };

  const cargarPlaylistACola = async (playlistId, esPropia = false) => {
    const token = getToken();
    try {
      const url = esPropia
        ? `${API_URL}/t2/playlistPropia/canciones/${playlistId}`
        : `${API_URL}/t/playlist/canciones/${playlistId}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const canciones = data.canciones || [];

      setCola(canciones);
      setCurrentIndex(0);
      setModoReproduccion("playlist");
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------ Renderizado de secciones ------------------
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
            }}
            onAdd={handleAddPlaylist}
          />
        );
      case "playlist":
        return (
          <PlaylistSugeridos
            playlists={playlistsPropia}
            onSelect={(playlist) => {
              setSelectedPlaylist(playlist);
              cargarPlaylistACola(playlist._id, true);
              setSeccionActiva("video");
            }}
            onAdd={handleAddPlaylist}
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
            cola={cola}
            currentIndex={currentIndex}
            setCurrentIndex={(i) => reproducirCancion(i, emitirCambiarCancion)}
            fullscreenRequested={shouldFullscreen}
            onFullscreenHandled={() => setShouldFullscreen(false)}
          />
        );
    }
  };

  // ------------------ Render principal ------------------
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
        <div className="d-flex flex-wrap justify-content-center align-items-center gap-3 m-3">
          <h2 className="text-white">Canciones a la cola</h2>
          {getColaVisible().map((cancion, idx) => {
            const indexReal =
              currentIndex - 2 > 0 ? idx + (currentIndex - 2) : idx;
            return (
              <div
                key={indexReal}
                onClick={() =>
                  reproducirCancion(indexReal, emitirCambiarCancion)
                }
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
        <h1 className="p-2 text-white">Las más populares</h1>
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
