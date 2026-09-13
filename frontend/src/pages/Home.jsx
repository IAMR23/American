import { useCallback, useRef, useState, useEffect } from "react";
import "../styles/inicial.css";
import "../styles/button.css";
import "../styles/disco.css";
import "../styles/home-mobile.css";
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

import { getToken, removeToken } from "../utils/auth";
import { jwtDecode } from "jwt-decode";
import usePlaylists from "../utils/usePlaylists";
import CelularPage from "./CelularPage";
import MesasPage from "./MesasPage";
import ConcursoPage from "./ConcursoPage";
import { useQueueContext } from "../hooks/QueueProvider";
import VideoCarousel from "../components/VideoCarousel";
import VideoCarouselVisibles from "../components/VideoCarouselVisibles";
import { useBackground } from "../hooks/BackgroundContext";
import ForgotPassword from "./ForgotPassword";
import WhatsAppButton from "../components/WhatsAppButton";
import User from "./User";
import { useSocketContext } from "../hooks/SocketContext";
import useMediaQuery from "../hooks/useMediaQuery";
import DesktopHomeLayout from "../components/home/DesktopHomeLayout";
import MobileHomeLayout from "../components/home/MobileHomeLayout";

const FULLSCREEN_REQUEST_KEY = "openPlayerFullscreen";
const MESAS_STORAGE_KEY = "karaokeMesas";
const CONCURSO_STORAGE_KEY = "karaokeConcurso";
const FREE_USER_SUBSCRIBE_PROMPT_START_INDEX = 6;
const GUEST_CONTINUE_PROMPT_START_INDEX = 6;

export default function Home() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("video");
  const [shouldFullscreen, setShouldFullscreen] = useState(false);
  const [user, setUser] = useState(null);
  const [modoCalificacion, setModoCalificacion] = useState(false);
  const [modoMesa, setModoMesa] = useState(false);
  const [modoConcurso, setModoConcurso] = useState(false);
  const [auth, setAuth] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [colaDefault, setColaDefault] = useState([]);
  const [token, setToken] = useState(getToken());
  const [roomId, setRoomId] = useState(null);
  const [playerResetKey, setPlayerResetKey] = useState(0);
  const subscribeButtonRef = useRef(null);

  // ✅ NUEVO: evita cambiar la canción directo desde Home
  const [requestedIndex, setRequestedIndex] = useState(null);

  const { background } = useBackground();
  const { connectSocket } = useSocketContext();

  const {
    cola,
    currentIndex,
    modoMesaActivo,
    modoMesaItems,
    modoConcursoActivo,
    concursoItems,
    setCola,
    setCurrentIndex,
    setModoConcursoActivo,
    setModoConcursoFinalizado,
    setConcursoItems,
    changeSong,
    clearQueue,
  } = useQueueContext();

  const { playlistsPropia } = usePlaylists(userId);
  const modoMesaEncendido = modoMesa || modoMesaActivo;
  const modoConcursoEncendido = modoConcurso || modoConcursoActivo;
  const isGuest = !auth || !token;
  const canUseSystem = Boolean(auth && token && (userRole === "admin" || isSubscribed));
  const isFreeUser = Boolean(auth && token && userRole !== "admin" && !isSubscribed);
  const shouldShowSubscribeOption = isFreeUser;
  const isMobileLayout = useMediaQuery(
    "(max-width: 768px), (max-width: 1024px) and (orientation: landscape)",
  );

  const getSubscribePromptOrigin = useCallback(
    () => subscribeButtonRef.current?.getBoundingClientRect?.() || null,
    [],
  );

  const handleModoMesaChange = useCallback((activo) => {
    setModoMesa(activo);
    if (activo) {
      setModoConcurso(false);
      setModoCalificacion(false);
    }
  }, []);

  const handleModoConcursoChange = useCallback((activo) => {
    setModoConcurso(activo);
    if (activo) {
      setModoMesa(false);
      setModoCalificacion(false);
    }
  }, []);

  const MIN_ANTERIORES = 2;

  const getColaVisible = () => {
    const esColaDefault = !cola.length;

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
    const validarTokenActual = () => {
      const currentToken = getToken();
      setToken(currentToken);

      if (!currentToken) {
        setAuth(false);
        setUserId(null);
        setUserRole(null);
        setUser(null);
        return;
      }

      try {
        const decodedToken = jwtDecode(currentToken);

        if (decodedToken.exp * 1000 < Date.now()) {
          removeToken();
          setAuth(false);
          setUserId(null);
          setUserRole(null);
          setUser(null);
        } else {
          setAuth(true);
          setUserId(decodedToken.userId);
          setUserRole(decodedToken.rol);
        }
      } catch (error) {
        console.error("Error al decodificar el token", error);
        removeToken();
        setAuth(false);
        setUserId(null);
        setUserRole(null);
        setUser(null);
      }
    };

    validarTokenActual();
    window.addEventListener("auth-token-changed", validarTokenActual);

    return () => {
      window.removeEventListener("auth-token-changed", validarTokenActual);
    };
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(FULLSCREEN_REQUEST_KEY) !== "1") return;

    sessionStorage.removeItem(FULLSCREEN_REQUEST_KEY);
    setSeccionActiva("video");
    setShouldFullscreen(true);
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

  const ensureActiveRoom = useCallback(async () => {
    try {
      let savedRoomId = localStorage.getItem("roomId");

      if (!savedRoomId) {
        const res = await fetch(`${API_URL}/room/create-room`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: "HOST" }),
        });

        if (!res.ok) {
          throw new Error("No se pudo crear la sala");
        }

        const data = await res.json();
        savedRoomId = data.roomId;
        localStorage.setItem("roomId", savedRoomId);
      }

      setRoomId(savedRoomId);
      connectSocket({ roomId: savedRoomId, user: "HOST" });
      return savedRoomId;
    } catch (error) {
      console.error("Error al crear/conectar sala:", error);
      return null;
    }
  }, [connectSocket]);

  // ✅ Crear sala una sola vez o cuando cambie conexión relevante
  useEffect(() => {
    ensureActiveRoom();
  }, [ensureActiveRoom]);

  const getColaActual = () => {
    const esColaVacia = !cola.length;
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
        setPlayerResetKey((prev) => prev + 1);
        await ensureActiveRoom();
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

    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch (err) {
      console.error("Error al cerrar la sesion persistente:", err);
    }

    removeToken();
    localStorage.removeItem("roomId");

    setToken(null);
    setUserId(null);
    setUserRole(null);
    setCola([]);
    setAuth(false);
    setUser(null);
    setRoomId(null);
    setModoMesa(false);
    setModoConcurso(false);
    setPlayerResetKey((prev) => prev + 1);
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

  const limpiarConcursoDesdePlayer = useCallback(async () => {
    try {
      if (roomId) {
        await axios.post(`${API_URL}/t/cola/modo-concurso/desactivar`, {
          roomId,
          finalizado: true,
        });
      }
    } catch (error) {
      console.error("Error limpiando concurso desde el reproductor:", error);
    } finally {
      localStorage.removeItem(CONCURSO_STORAGE_KEY);
      setModoConcurso(false);
      setModoMesa(false);
      setModoCalificacion(false);
      setRequestedIndex(null);
      setCola([]);
      setCurrentIndex?.(0);
      setModoConcursoActivo?.(false);
      setModoConcursoFinalizado?.(true);
      setConcursoItems?.([]);
      setPlayerResetKey((prev) => prev + 1);
      setSeccionActiva("video");
      document.exitFullscreen?.().catch?.(() => {});
    }
  }, [
    roomId,
    setCola,
    setConcursoItems,
    setCurrentIndex,
    setModoConcursoActivo,
    setModoConcursoFinalizado,
  ]);

  const getMesasGuardadas = () => {
    try {
      const mesas = JSON.parse(localStorage.getItem(MESAS_STORAGE_KEY) || "[]");
      return Array.isArray(mesas) ? mesas : [];
    } catch {
      return [];
    }
  };

  const borrarCancionTerminadaDeMesa = (cancionTerminada, indexTerminado) => {
    if (!modoMesaEncendido || !cancionTerminada?._id) return;

    const itemMesa = modoMesaItems?.[indexTerminado];
    if (!itemMesa) return;
    if (itemMesa.esVideoDefaultMesas) return;

    const mesas = getMesasGuardadas();
    let huboCambios = false;

    const mesasActualizadas = mesas.map((mesa, mesaIndex) => {
      const mesaNumero = Number(mesa.numero) || mesaIndex + 1;
      const mismaMesa =
        mesaNumero === Number(itemMesa.mesaNumero) ||
        mesa.nombre === itemMesa.mesaNombre;

      if (!mismaMesa) return mesa;

      const personas = mesa.personas || mesa.participantes || [];
      const personasActualizadas = personas.map((persona, personaIndex) => {
        const mismaPersona =
          personaIndex === Number(itemMesa.participanteIndex) ||
          persona.nombre === itemMesa.participanteNombre;

        if (!mismaPersona) return persona;

        const canciones = persona.canciones || [];
        const cancionIndex = Number(itemMesa.cancionIndex);
        const cancionesActualizadas = [...canciones];

        if (cancionesActualizadas[cancionIndex]?._id === cancionTerminada._id) {
          cancionesActualizadas.splice(cancionIndex, 1);
          huboCambios = true;
        } else {
          const indexPorId = cancionesActualizadas.findIndex(
            (cancion) => cancion._id === cancionTerminada._id,
          );

          if (indexPorId >= 0) {
            cancionesActualizadas.splice(indexPorId, 1);
            huboCambios = true;
          }
        }

        return {
          ...persona,
          canciones: cancionesActualizadas,
        };
      });

      return {
        ...mesa,
        personas: personasActualizadas,
      };
    });

    if (huboCambios) {
      localStorage.setItem(MESAS_STORAGE_KEY, JSON.stringify(mesasActualizadas));
    }
  };

  const marcarCancionTerminadaDeConcurso = async (
    _cancionTerminada,
    indexTerminado,
    itemConcurso,
  ) => {
    if (!modoConcursoEncendido || !roomId) return;

    try {
      const res = await axios.post(
        `${API_URL}/t/cola/modo-concurso/cancion-terminada`,
        {
          roomId,
          indexActual: indexTerminado,
          cancionId: _cancionTerminada?._id,
          participanteId: itemConcurso?.participanteId,
          cancionIndex: itemConcurso?.cancionIndex,
          esVideoDefaultConcurso: itemConcurso?.esVideoDefaultConcurso,
          esVideoFinalConcurso: itemConcurso?.esVideoFinalConcurso,
        },
      );

      console.log("[Concurso] Avance de cancion", {
        participante: res.data?.itemTerminado?.participanteNombre,
        cancionId: _cancionTerminada?._id,
        debugSistema: res.data?.debugSistema,
        calificacionesSistemaAgregadas:
          res.data?.calificacionesSistemaAgregadas || [],
        resultados: res.data?.resultados || [],
      });

      if (res.data?.modoConcursoActivo === false) {
        setModoConcurso(false);
      }

      if (res.data?.calificacionesSistemaAgregadas?.length) {
        console.log("[Concurso] Calificaciones automaticas del sistema", {
          participante: res.data?.itemTerminado?.participanteNombre,
          cancionIndex: res.data?.itemTerminado?.cancionIndex,
          calificaciones: res.data.calificacionesSistemaAgregadas,
        });
      } else if (res.data?.itemTerminado) {
        console.warn(
          "[Concurso] No se agregaron calificaciones automaticas del sistema. Revisa que /p/puntaje tenga registros con calificacion numerica.",
        );
      }
    } catch (error) {
      console.error("Error al avanzar concurso:", error);
    }
  };

  const handleCancionTerminada = (
    cancionTerminada,
    indexTerminado,
    itemConcurso,
  ) => {
    borrarCancionTerminadaDeMesa(cancionTerminada, indexTerminado);
    marcarCancionTerminadaDeConcurso(
      cancionTerminada,
      indexTerminado,
      itemConcurso,
    );
  };

  const activarPantallaCompletaPlayer = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch((err) => {
        console.warn("No se pudo activar pantalla completa:", err);
      });
    }

    setSeccionActiva("video");
    setShouldFullscreen(true);
  };

  const handleRegisterSuccess = async () => {
    await handleLoginSuccess();
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

      case "mesas":
        return (
          <MesasPage
            roomId={roomId}
            modoMesaActivo={modoMesaEncendido}
            modoConcursoActivo={modoConcursoEncendido}
            onModoMesaChange={handleModoMesaChange}
            onOpenPlayerFullscreen={activarPantallaCompletaPlayer}
          />
        );

      case "concurso":
        return (
          <ConcursoPage
            roomId={roomId}
            modoConcursoActivo={modoConcursoEncendido}
            modoCalificacionActivo={modoCalificacion}
            onModoConcursoChange={handleModoConcursoChange}
            onOpenPlayerFullscreen={activarPantallaCompletaPlayer}
          />
        );

      case "user":
        return <User onGoPasswordReset={() => setSeccionActiva("password")} />;

      case "video":
      default: {
        const esColaDefault = !cola.length;
        const colaActual = getColaActual();

        return (
          <VideoPlayer
            key={`${esColaDefault ? "default" : "queue"}-${playerResetKey}`}
            cola={colaActual}
            esColaDefault={esColaDefault}
            modoCalificacion={modoCalificacion}
            modoMesaActivo={modoMesaEncendido}
            modoMesaItems={modoMesaItems}
            modoConcursoActivo={modoConcursoEncendido}
            concursoItems={concursoItems}
            roomId={roomId}
            currentIndex={currentIndex}
            setCurrentIndex={changeSong}
            requestedIndex={requestedIndex}
            onRequestedIndexHandled={() => setRequestedIndex(null)}
            fullscreenRequested={shouldFullscreen}
            onFullscreenHandled={() => setShouldFullscreen(false)}
            onCancionTerminada={handleCancionTerminada}
            onLimpiarConcurso={limpiarConcursoDesdePlayer}
            showSubscribePrompt={false}
            subscribePromptStartIndex={
              isFreeUser ? FREE_USER_SUBSCRIBE_PROMPT_START_INDEX : null
            }
            guestPromptStartIndex={
              isGuest ? GUEST_CONTINUE_PROMPT_START_INDEX : null
            }
            getSubscribePromptOrigin={getSubscribePromptOrigin}
            onSubscribePromptClick={() =>
              setSeccionActiva(auth && token ? "suscribir" : "registrar")
            }
            onColaTerminada={() => {
              if (!esColaDefault && !modoConcursoEncendido) {
                clearQueue();
              }
            }}
          />
        );
      }
    }
  };

  const content = renderContenido();
  const hasToken = Boolean(token);
  const showDashboard = canUseSystem && hasToken && userRole === "admin";
  const layoutProps = {
    background,
    canUseSystem,
    user,
    showDashboard,
    isGuest,
    shouldShowSubscribeOption,
    hasToken,
    subscribeButtonRef,
    seccionActiva,
    setSeccionActiva,
    navigate,
    cerrarSesion,
    modoCalificacion,
    setModoCalificacion,
    modoMesaEncendido,
    modoConcursoEncendido,
    content,
    getColaVisible,
    currentIndex,
    handleCambiarCancion,
    limpiarCola,
  };
  const Layout = isMobileLayout ? MobileHomeLayout : DesktopHomeLayout;

  return (
    <>
      <Layout {...layoutProps} />

      <div className="fondo p-2">
        <AnunciosVisibles />

        <h1 className="p-2 text-white">Recomendados</h1>
        <VideoCarouselVisibles
          canUseActions={canUseSystem}
          onPlaySolo={activarPantallaCompletaPlayer}
          itemsPerPage={isMobileLayout ? 2 : 4}
        />

        <h1 className="p-2 text-white">Las más populares</h1>
        <VideoCarousel
          canUseActions={canUseSystem}
          onPlaySolo={activarPantallaCompletaPlayer}
          itemsPerPage={isMobileLayout ? 2 : 4}
        />
      </div>

      {isFreeUser && <WhatsAppButton />}
    </>
  );
}
