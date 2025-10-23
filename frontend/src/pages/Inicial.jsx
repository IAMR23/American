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
import usePlaylists from "../utils/usePlaylists";
import CelularPage from "./CelularPage";
import { useQueueContext } from "../hooks/QueueProvider";

export default function Inicial() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("video");
  const [shouldFullscreen, setShouldFullscreen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

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
      console.log("Usuario autenticado:", decoded.userId);
    } catch (err) {
      console.error("Token inválido", err);
    }
  });

  // ------------------ Funciones ------------------
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
        setModoReproduccion("cola");

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
    setModoReproduccion("cola");
  };

  // Función mejorada para cambiar canción con sincronización
  const handleCambiarCancion = (index) => {
    setCurrentIndex(index);
    emitirCambiarCancion(index);
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

  const handlePlaySong = (index) => {
    setCurrentIndex(index);
    setSeccionActiva("video"); // para asegurarse de mostrar el reproductor
    setShouldFullscreen(true); // activar fullscreen en VideoPlayer
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
            setCurrentIndex={handleCambiarCancion}
            fullscreenRequested={shouldFullscreen}
            onFullscreenHandled={() => setShouldFullscreen(false)}
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

        <div className="d-flex flex-column m-3">
          <div className="d-flex align-items-start gap-3">
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
                    onClick={() => handleCambiarCancion(indexReal)}
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
          </div>
        </div>

        {/* <div style={{ margin: "1rem" }}>
          <h2 style={{ color: "white" }}>Canciones a la cola</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {cola.map((cancion, idx) => (
              <div
                key={idx}
                onClick={() => handleCambiarCancion(idx)}
                style={{ cursor: "pointer", textAlign: "center" }}
              >
                <FaCompactDisc
                  size={40}
                  color={idx === currentIndex ? "red" : "blue"}
                />
                <div style={{ fontSize: "0.8rem" }}>
                  <strong>{cancion.titulo}</strong>
                  <br />
                  <small>{cancion.artista}</small>
                </div>
              </div>
            ))}
          </div>
        </div> */}
      </div>

      <div className="fondo p-2">
        <AnunciosVisibles />
        <h1 className="p-2 text-white">Selección especial</h1>
        <Carrousel className="bg-dark" />
        <h1 className="p-2 text-white">Las más populares</h1>
        <MasReproducidas />
      </div>
    </>
  );
}
