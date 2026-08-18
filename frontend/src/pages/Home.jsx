import { useCallback, useState, useEffect, useRef } from "react";
import "../styles/inicial.css";
import "../styles/button.css";
import "../styles/disco.css";
import { FaCompactDisc } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
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

import { getToken, removeToken, syncTokenWithBrowserState } from "../utils/auth";
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
import { useSubscription } from "../utils/SubscriptionContext";

const FULLSCREEN_REQUEST_KEY = "openPlayerFullscreen";
const MESAS_STORAGE_KEY = "karaokeMesas";
const CONCURSO_STORAGE_KEY = "karaokeConcurso";
const GUEST_PLAY_COUNT_KEY = "americanKaraokeGuestPlayCount";
const GUEST_PLAY_LIMIT = 6;
const REGISTERED_TRIAL_PLAY_COUNT_KEY =
  "americanKaraokeRegisteredTrialPlayCount";
const REGISTERED_TRIAL_LIMIT = 6;
const SECCIONES_PUBLICAS = new Set([
  "ingresar",
  "registrar",
  "password",
  "suscribir",
  "user",
]);
const SECCIONES_AUTH = new Set([
  "ingresar",
  "registrar",
  "password",
  "suscribir",
]);
const SECCIONES_PREMIUM = new Set([
  "video",
  "buscador",
  "favoritos",
  "playlist",
  "sugerirCanciones",
  "listadoPdf",
  "ayuda",
  "Celular",
  "mesas",
  "concurso",
]);

const getGuestPlayCount = () => {
  if (typeof window === "undefined") return 0;

  const count = Number.parseInt(
    window.localStorage.getItem(GUEST_PLAY_COUNT_KEY) || "0",
    10,
  );

  return Number.isFinite(count) && count > 0 ? count : 0;
};

const getRegisteredTrialKey = (id) =>
  `${REGISTERED_TRIAL_PLAY_COUNT_KEY}:${id || "sin-usuario"}`;

const getRegisteredTrialPlayCount = (id) => {
  if (typeof window === "undefined" || !id) return 0;

  const count = Number.parseInt(
    window.localStorage.getItem(getRegisteredTrialKey(id)) || "0",
    10,
  );

  return Number.isFinite(count) && count > 0 ? count : 0;
};

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("video");
  const [shouldFullscreen, setShouldFullscreen] = useState(false);
  const [user, setUser] = useState(null);
  const [modoCalificacion, setModoCalificacion] = useState(false);
  const [modoMesa, setModoMesa] = useState(false);
  const [modoConcurso, setModoConcurso] = useState(false);
  const [auth, setAuth] = useState(false);
  const [colaDefault, setColaDefault] = useState([]);
  const [token, setToken] = useState(() => syncTokenWithBrowserState());
  const [roomId, setRoomId] = useState(null);
  const [playerResetKey, setPlayerResetKey] = useState(0);
  const [guestPlayCount, setGuestPlayCount] = useState(getGuestPlayCount);
  const [registeredTrialPlayCount, setRegisteredTrialPlayCount] = useState(0);
  const [showGuestRegisterModal, setShowGuestRegisterModal] = useState(false);

  // ✅ NUEVO: evita cambiar la canción directo desde Home
  const [requestedIndex, setRequestedIndex] = useState(null);
  const [colaActivaEnPlayer, setColaActivaEnPlayer] = useState(false);
  const [iniciarPrimeraColaPendiente, setIniciarPrimeraColaPendiente] =
    useState(false);
  const activandoPrimeraColaRef = useRef(false);

  const { background } = useBackground();
  const { connectSocket, disconnectSocket } = useSocketContext();
  const {
    loading: cargandoSuscripcion,
    tieneAccesoKaraoke,
  } = useSubscription();

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

  const { playlistsPropia } = usePlaylists(userId, tieneAccesoKaraoke);
  const esInvitado = !auth && !token;
  const esRegistradoSinSuscripcion =
    auth && !cargandoSuscripcion && !tieneAccesoKaraoke;
  const puedeVerVideoPublico =
    tieneAccesoKaraoke || esInvitado || esRegistradoSinSuscripcion;
  const accesoPremiumBloqueado = cargandoSuscripcion || !tieneAccesoKaraoke;
  const mostrarSuscripcionSuperior =
    esRegistradoSinSuscripcion &&
    registeredTrialPlayCount < REGISTERED_TRIAL_LIMIT &&
    seccionActiva !== "suscribir";
  const mostrarSuscripcionCentral =
    esRegistradoSinSuscripcion &&
    registeredTrialPlayCount >= REGISTERED_TRIAL_LIMIT &&
    seccionActiva !== "suscribir";
  const modoMesaEncendido = modoMesa || modoMesaActivo;
  const modoConcursoEncendido = modoConcurso || modoConcursoActivo;
  const actualizarIndicePlayer = useCallback(
    (index) => {
      const requested = Number(index);

      if (!Number.isFinite(requested) || requested < 0) return;

      setCurrentIndex?.(requested);

      if (tieneAccesoKaraoke) {
        changeSong(requested);
      }
    },
    [changeSong, setCurrentIndex, tieneAccesoKaraoke],
  );

  const irASeccion = useCallback(
    (seccion) => {
      if (
        seccion === "video" &&
        (esInvitado || esRegistradoSinSuscripcion)
      ) {
        setSeccionActiva(seccion);
        return;
      }

      if (SECCIONES_PREMIUM.has(seccion) && !tieneAccesoKaraoke) {
        setSeccionActiva(auth ? "suscribir" : "ingresar");
        return;
      }

      setSeccionActiva(seccion);
    },
    [auth, esInvitado, esRegistradoSinSuscripcion, tieneAccesoKaraoke],
  );

  const navegarPremium = useCallback(
    (path) => {
      if (!tieneAccesoKaraoke) {
        setSeccionActiva(auth ? "suscribir" : "ingresar");
        navigate("/", { replace: true });
        return;
      }

      navigate(path);
    },
    [auth, navigate, tieneAccesoKaraoke],
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

    const indiceVisible = colaActivaEnPlayer ? currentIndex : 0;
    const start =
      indiceVisible - MIN_ANTERIORES > 0 ? indiceVisible - MIN_ANTERIORES : 0;

    return cola
      .map((c, i) => ({ cancion: c, index: i }))
      .slice(start)
      .filter((item) => item.cancion && item.cancion._id);
  };

  // Validar token activo, incluso al volver desde el historial del navegador.
  useEffect(() => {
    const validarTokenActual = () => {
      const currentToken = syncTokenWithBrowserState();
      setToken(currentToken);

      if (!currentToken) {
        setAuth(false);
        setUserId(null);
        setUserRole(null);
        return;
      }

      try {
        const decodedToken = jwtDecode(currentToken);

        if (decodedToken.exp * 1000 < Date.now()) {
          removeToken({ markLogout: false });
          setAuth(false);
          setUserId(null);
          setUserRole(null);
        } else {
          setAuth(true);
          setUserId(decodedToken.userId || decodedToken.id);
          setUserRole(decodedToken.rol);
        }
      } catch (error) {
        console.error("Error al decodificar el token", error);
        removeToken({ markLogout: false });
        setAuth(false);
        setUserId(null);
        setUserRole(null);
      }
    };

    validarTokenActual();
    window.addEventListener("auth-token-changed", validarTokenActual);
    window.addEventListener("pageshow", validarTokenActual);
    window.addEventListener("focus", validarTokenActual);
    window.addEventListener("storage", validarTokenActual);

    const validarAlVolverVisible = () => {
      if (!document.hidden) {
        validarTokenActual();
      }
    };

    document.addEventListener("visibilitychange", validarAlVolverVisible);

    return () => {
      window.removeEventListener("auth-token-changed", validarTokenActual);
      window.removeEventListener("pageshow", validarTokenActual);
      window.removeEventListener("focus", validarTokenActual);
      window.removeEventListener("storage", validarTokenActual);
      document.removeEventListener("visibilitychange", validarAlVolverVisible);
    };
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(FULLSCREEN_REQUEST_KEY) !== "1") return;
    if (!puedeVerVideoPublico) return;

    sessionStorage.removeItem(FULLSCREEN_REQUEST_KEY);
    irASeccion("video");
    setShouldFullscreen(true);
  }, [irASeccion, puedeVerVideoPublico]);

  const getUser = async () => {
    try {
      const currentToken = getToken();

      if (!currentToken) throw new Error("No hay token disponible");

      const res = await axios.get(`${API_URL}/api/auth/me`, {
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
      getUser();
      setRegisteredTrialPlayCount(getRegisteredTrialPlayCount(userId));
    } else {
      setUser(null);
      setRegisteredTrialPlayCount(0);
    }
  }, [userId]);

  useEffect(() => {
    if (!puedeVerVideoPublico) {
      setColaDefault([]);
      return;
    }

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
  }, [puedeVerVideoPublico]);

  const ensureActiveRoom = useCallback(async () => {
    if (!tieneAccesoKaraoke) return null;

    try {
      let savedRoomId = localStorage.getItem("roomId");
      const savedRoomOwnerId = localStorage.getItem("roomOwnerId");
      const currentToken = getToken();
      const ownerId = userId ? String(userId) : "";

      if (!currentToken || !ownerId) return null;

      if (savedRoomId && savedRoomOwnerId !== ownerId) {
        localStorage.removeItem("roomId");
        localStorage.removeItem("roomOwnerId");
        savedRoomId = null;
      }

      if (!savedRoomId) {
        const res = await fetch(`${API_URL}/room/create-room`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ user: "HOST" }),
        });

        if (!res.ok) {
          throw new Error("No se pudo crear la sala");
        }

        const data = await res.json();
        savedRoomId = data.roomId;
        localStorage.setItem("roomId", savedRoomId);
        localStorage.setItem("roomOwnerId", ownerId);
      }

      setRoomId(savedRoomId);
      connectSocket({ roomId: savedRoomId, user: "HOST" });
      return savedRoomId;
    } catch (error) {
      console.error("Error al crear/conectar sala:", error);
      return null;
    }
  }, [connectSocket, tieneAccesoKaraoke, token, userId]);

  useEffect(() => {
    if (cargandoSuscripcion) return;

    if (tieneAccesoKaraoke) {
      ensureActiveRoom();
      return;
    }

    disconnectSocket();
    setRoomId(null);
    localStorage.removeItem("roomId");
    localStorage.removeItem("roomOwnerId");
  }, [
    cargandoSuscripcion,
    disconnectSocket,
    ensureActiveRoom,
    tieneAccesoKaraoke,
  ]);

  const getColaActual = () => {
    return colaActivaEnPlayer && cola.length ? cola : colaDefault;
  };

  const handleLoginSuccess = async () => {
    const currentToken = getToken();

    if (currentToken) {
      try {
        const decoded = jwtDecode(currentToken);

        setToken(currentToken);
        setUserId(decoded.userId || decoded.id);
        setUserRole(decoded.rol);
        setCola([]);
        setColaActivaEnPlayer(false);
        setIniciarPrimeraColaPendiente(false);
        activandoPrimeraColaRef.current = false;
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
    disconnectSocket();
    localStorage.removeItem("roomId");
    localStorage.removeItem("roomOwnerId");
    localStorage.removeItem(MESAS_STORAGE_KEY);
    localStorage.removeItem(CONCURSO_STORAGE_KEY);
    sessionStorage.removeItem(FULLSCREEN_REQUEST_KEY);

    setToken(null);
    setUserId(null);
    setUserRole(null);
    setCola([]);
    setColaActivaEnPlayer(false);
    setIniciarPrimeraColaPendiente(false);
    activandoPrimeraColaRef.current = false;
    setAuth(false);
    setUser(null);
    setRoomId(null);
    setModoMesa(false);
    setModoConcurso(false);
    setPlayerResetKey((prev) => prev + 1);
    setRequestedIndex(null);
    setRegisteredTrialPlayCount(0);
    setShouldFullscreen(false);
    setSeccionActiva("ingresar");
    navigate("/", { replace: true, state: { seccion: "ingresar" } });
  };

  // ✅ CAMBIO IMPORTANTE:
  // Ya no cambia directo con changeSong(index).
  // Primero manda requestedIndex al VideoPlayer.
  const handleCambiarCancion = (index) => {
    const requested = Number(index);

    if (!Number.isFinite(requested) || requested < 0) return;

    setColaActivaEnPlayer(true);
    actualizarIndicePlayer(requested);
    setRequestedIndex(null);
    setTimeout(() => setRequestedIndex(requested), 0);
  };

  const reproducirPrimeraCancionDeCola = useCallback(() => {
    if (
      colaActivaEnPlayer ||
      iniciarPrimeraColaPendiente ||
      activandoPrimeraColaRef.current
    ) {
      return;
    }

    activandoPrimeraColaRef.current = true;
    setIniciarPrimeraColaPendiente(true);
  }, [colaActivaEnPlayer, iniciarPrimeraColaPendiente]);

  useEffect(() => {
    if (!iniciarPrimeraColaPendiente) return;
    if (!cola.length) return;

    setColaActivaEnPlayer(true);
    irASeccion("video");
    actualizarIndicePlayer(0);

    setRequestedIndex(null);
    setTimeout(() => setRequestedIndex(0), 0);
    setIniciarPrimeraColaPendiente(false);
    activandoPrimeraColaRef.current = false;
  }, [
    cola.length,
    actualizarIndicePlayer,
    iniciarPrimeraColaPendiente,
    irASeccion,
  ]);

  const limpiarCola = () => {
    if (tieneAccesoKaraoke) {
      clearQueue();
    } else {
      setCola([]);
      setCurrentIndex?.(0);
    }

    setColaActivaEnPlayer(false);
    setIniciarPrimeraColaPendiente(false);
    activandoPrimeraColaRef.current = false;
    setRequestedIndex(null);
  };

  const handleColaTerminada = () => {
    if (modoConcursoEncendido) return;

    if (tieneAccesoKaraoke) {
      clearQueue();
    }

    setCola([]);
    setCurrentIndex?.(0);
    setColaActivaEnPlayer(false);
    setIniciarPrimeraColaPendiente(false);
    activandoPrimeraColaRef.current = false;
    setRequestedIndex(null);
    setPlayerResetKey((prev) => prev + 1);
    setSeccionActiva("video");
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
      setColaActivaEnPlayer(false);
      setIniciarPrimeraColaPendiente(false);
      activandoPrimeraColaRef.current = false;
      setCurrentIndex?.(0);
      setModoConcursoActivo?.(false);
      setModoConcursoFinalizado?.(true);
      setConcursoItems?.([]);
      setPlayerResetKey((prev) => prev + 1);
      setSeccionActiva(tieneAccesoKaraoke ? "video" : "suscribir");
      document.exitFullscreen?.().catch?.(() => {});
    }
  }, [
    roomId,
    setCola,
    setConcursoItems,
    setCurrentIndex,
    setModoConcursoActivo,
    setModoConcursoFinalizado,
    tieneAccesoKaraoke,
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
    if (!tieneAccesoKaraoke || !modoConcursoEncendido || !roomId) return;

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

  const registrarReproduccionInvitado = () => {
    if (!esInvitado) return;

    setGuestPlayCount((prev) => {
      const next = prev + 1;
      localStorage.setItem(GUEST_PLAY_COUNT_KEY, String(next));

      if (next >= GUEST_PLAY_LIMIT) {
        setShowGuestRegisterModal(true);
      }

      return next;
    });
  };

  const registrarReproduccionRegistradoSinSuscripcion = () => {
    if (!esRegistradoSinSuscripcion || !userId) return;

    setRegisteredTrialPlayCount((prev) => {
      const next = prev + 1;
      localStorage.setItem(getRegisteredTrialKey(userId), String(next));
      return next;
    });
  };

  const handleVideoTerminado = (
    cancionTerminada,
    indexTerminado,
    itemConcurso,
  ) => {
    registrarReproduccionInvitado();
    registrarReproduccionRegistradoSinSuscripcion();
    handleCancionTerminada(cancionTerminada, indexTerminado, itemConcurso);
  };

  const activarPantallaCompletaPlayer = () => {
    if (!puedeVerVideoPublico) {
      irASeccion("suscribir");
      return;
    }

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch((err) => {
        console.warn("No se pudo activar pantalla completa:", err);
      });
    }

    irASeccion("video");
    setShouldFullscreen(true);
  };

  const handleRegisterSuccess = () => {
    setShowGuestRegisterModal(false);
    setSeccionActiva("video");
  };

  useEffect(() => {
    if (!esInvitado) {
      setShowGuestRegisterModal(false);
      return;
    }

    if (guestPlayCount >= GUEST_PLAY_LIMIT) {
      setShowGuestRegisterModal(true);
    }
  }, [esInvitado, guestPlayCount]);

  useEffect(() => {
    if (location.state?.seccion) {
      irASeccion(location.state.seccion);
    }
  }, [irASeccion, location.state]);

  useEffect(() => {
    if (cargandoSuscripcion) return;

    if (tieneAccesoKaraoke) {
      if (auth && SECCIONES_AUTH.has(seccionActiva)) {
        setSeccionActiva("video");
      }
      return;
    }

    if (
      seccionActiva === "video" &&
      (esInvitado || esRegistradoSinSuscripcion)
    ) {
      return;
    }

    if (
      (esInvitado || esRegistradoSinSuscripcion) &&
      SECCIONES_PUBLICAS.has(seccionActiva)
    ) {
      setColaActivaEnPlayer(false);
      setIniciarPrimeraColaPendiente(false);
      activandoPrimeraColaRef.current = false;
      setRequestedIndex(null);
      setShouldFullscreen(false);
      document.exitFullscreen?.().catch?.(() => {});
      return;
    }

    setCola([]);
    setColaActivaEnPlayer(false);
    setIniciarPrimeraColaPendiente(false);
    activandoPrimeraColaRef.current = false;
    setCurrentIndex?.(0);
    setModoMesa(false);
    setModoConcurso(false);
    setModoCalificacion(false);
    setModoConcursoActivo?.(false);
    setModoConcursoFinalizado?.(false);
    setConcursoItems?.([]);
    setRequestedIndex(null);
    setShouldFullscreen(false);
    setPlayerResetKey((prev) => prev + 1);
    localStorage.removeItem(MESAS_STORAGE_KEY);
    localStorage.removeItem(CONCURSO_STORAGE_KEY);
    document.exitFullscreen?.().catch?.(() => {});

    if (!SECCIONES_PUBLICAS.has(seccionActiva)) {
      setSeccionActiva(auth ? "suscribir" : "ingresar");
    }
  }, [
    auth,
    cargandoSuscripcion,
    esInvitado,
    esRegistradoSinSuscripcion,
    seccionActiva,
    setCola,
    setConcursoItems,
    setCurrentIndex,
    setModoConcursoActivo,
    setModoConcursoFinalizado,
    tieneAccesoKaraoke,
  ]);

  const renderContenido = () => {
    if (cargandoSuscripcion && SECCIONES_PREMIUM.has(seccionActiva)) {
      return <p className="text-light">Cargando...</p>;
    }

    if (
      !tieneAccesoKaraoke &&
      SECCIONES_PREMIUM.has(seccionActiva) &&
      !(
        seccionActiva === "video" &&
        (esInvitado || esRegistradoSinSuscripcion)
      )
    ) {
      return auth ? (
        <PlantTest />
      ) : (
        <LoginForm
          setToken={setToken}
          onLoginSuccess={handleLoginSuccess}
          onGoRegister={() => irASeccion("registrar")}
          onGoPasswordReset={() => irASeccion("password")}
        />
      );
    }

    switch (seccionActiva) {
      case "buscador":
        return <BuscadorTabla onSelectAll={() => irASeccion("video")} />;

      case "favoritos":
        return (
          <FavoritePlaylist
            userId={userId}
            onSelectAll={() => irASeccion("video")}
          />
        );

      case "playlist":
        return (
          <PlaylistSugeridos
            playlists={playlistsPropia}
            onSelectAll={() => irASeccion("video")}
          />
        );

      case "sugerirCanciones":
        return <SolicitudesCancion />;

      case "ingresar":
        return (
          <LoginForm
            setToken={setToken}
            onLoginSuccess={handleLoginSuccess}
            onGoRegister={() => irASeccion("registrar")}
            onGoPasswordReset={() => irASeccion("password")}
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
        return <User onGoPasswordReset={() => irASeccion("password")} />;

      case "video":
      default: {
        const esColaDefault = !(colaActivaEnPlayer && cola.length);
        const colaActual = getColaActual();

        return (
          <VideoPlayer
            key={`video-player-${playerResetKey}`}
            cola={colaActual}
            esColaDefault={esColaDefault}
            modoCalificacion={modoCalificacion}
            modoMesaActivo={modoMesaEncendido}
            modoMesaItems={modoMesaItems}
            modoConcursoActivo={modoConcursoEncendido}
            concursoItems={concursoItems}
            roomId={roomId}
            currentIndex={currentIndex}
            setCurrentIndex={actualizarIndicePlayer}
            requestedIndex={requestedIndex}
            onRequestedIndexHandled={() => setRequestedIndex(null)}
            fullscreenRequested={shouldFullscreen}
            onFullscreenHandled={() => setShouldFullscreen(false)}
            onCancionTerminada={handleVideoTerminado}
            modoInvitado={!tieneAccesoKaraoke}
            onLimpiarConcurso={limpiarConcursoDesdePlayer}
            onColaTerminada={() => {
              if (!esColaDefault) {
                handleColaTerminada();
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
        className="container-fluid px-2 px-md-4 py-3 d-flex flex-column align-items-center home-shell"
        style={{
          backgroundImage: background ? `url(${background})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
        }}
      >
        <div className="row align-items-center justify-content-center g-2 g-md-3 w-100 home-header">
          <div className="col-3 col-sm-2 col-md-1 d-flex justify-content-center">
            <img src="./icono.png" alt="icono" className="home-icon" />
          </div>

          <div className="col-9 col-sm-8 col-md-7 col-lg-6 d-flex justify-content-center">
            <img
              onClick={() => irASeccion("video")}
              src="./logo.png"
              alt="logo"
              className="img-fluid home-logo"
            />
          </div>

          {user && user.nombre && (
            <div className="col-12 d-flex d-lg-none justify-content-center">
              <div className="home-user-panel text-center text-white">
                <h3 className="outlined-black home-user-title">Bienvenido:</h3>

                <button
                  onClick={() => irASeccion("user")}
                  className="boton0"
                >
                  {user.nombre}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="container-fluid px-0">
          <div className="row g-3 align-items-start justify-content-center home-main-row">
            <div className="col-12 col-lg-2 d-flex flex-column align-items-center justify-content-start gap-1 home-sidebar">
              {getToken() && userRole === "admin" && (
                <button
                  className="boton2"
                  onClick={() => navigate("/dashboard")}
                >
                  Dashboard
                </button>
              )}

              {mostrarSuscripcionSuperior && !tieneAccesoKaraoke && (
                <button
                  className="boton8 subscribe-action-top"
                  onClick={() => irASeccion("suscribir")}
                >
                  Suscribirse
                </button>
              )}

              <button
                className="boton1"
                onClick={() => irASeccion("buscador")}
                disabled={accesoPremiumBloqueado}
              >
                Buscador
              </button>

              <button
                className="boton2"
                onClick={() => irASeccion("playlist")}
                disabled={accesoPremiumBloqueado}
              >
                PlayList
              </button>

              <button
                className="boton3"
                onClick={() => navegarPremium("/ultimas-subidas")}
                disabled={accesoPremiumBloqueado}
              >
                Lo último
              </button>

              <button
                className="boton4"
                onClick={() => irASeccion("favoritos")}
                disabled={accesoPremiumBloqueado}
              >
                Favoritos
              </button>

              <button
                onClick={() => navegarPremium("/listaCanciones")}
                className="boton7"
                disabled={accesoPremiumBloqueado}
              >
                Canciones
              </button>

              <button
                className="boton3"
                onClick={() => irASeccion("sugerirCanciones")}
                disabled={accesoPremiumBloqueado}
              >
                Sugerir
              </button>
            </div>

            <div className="col-12 col-lg-8 home-center-column">
              <div className="justify-content-center home-content">
                {renderContenido()}
              </div>

              <div className="home-bottom-actions">
                <button
                  className="boton2"
                  onClick={() => irASeccion("Celular")}
                  disabled={accesoPremiumBloqueado}
                >
                  Celular
                </button>

                <button
                  className={`boto home-mode-button ${
                    modoMesaEncendido ? "boto-activo" : ""
                  }`}
                  onClick={() => irASeccion("mesas")}
                  disabled={accesoPremiumBloqueado}
                >
                  <img src="./Botonmesas22.png" alt="Mesas" />
                </button>

                <button
                  className={`boto home-mode-button ${
                    modoConcursoEncendido ? "boto-activo" : ""
                  }`}
                  onClick={() => irASeccion("concurso")}
                  disabled={accesoPremiumBloqueado || modoCalificacion}
                >
                  <img src="./BotonConcurso22.png" alt="Concurso" />
                </button>
              </div>
            </div>

            <div className="col-12 col-lg-2 d-flex flex-column align-items-center justify-content-start gap-1 home-sidebar">
              {user && user.nombre && (
                <div className="d-none d-lg-flex justify-content-center w-100">
                  <div className="home-user-panel text-center text-white">
                    <h3 className="outlined-black home-user-title">
                      Bienvenido:
                    </h3>

                    <button
                      onClick={() => irASeccion("user")}
                      className="boton0"
                    >
                      {user.nombre}
                    </button>
                  </div>
                </div>
              )}

              {!getToken() && (
                <>
                  <button
                    className="boton8"
                    onClick={() => irASeccion("ingresar")}
                  >
                    Ingresar
                  </button>

                  <button
                    className="boton7"
                    onClick={() => irASeccion("registrar")}
                  >
                    Registrar
                  </button>
                </>
              )}

              <button
                className="boton9"
                onClick={() => irASeccion("listadoPdf")}
                disabled={accesoPremiumBloqueado}
              >
                Listado PDF
              </button>

              <button
                disabled={accesoPremiumBloqueado || modoConcursoEncendido}
                onClick={() => {
                  if (modoConcursoEncendido) return;
                  if (!tieneAccesoKaraoke) {
                    irASeccion("suscribir");
                    return;
                  }
                  setModoCalificacion((prev) => !prev);
                }}
                className={`boto ${modoCalificacion ? "boto-activo" : ""}`}
              >
                <img src="./cal.png" alt="" width={250} />
              </button>

              <button
                className="boton1"
                onClick={() => irASeccion("ayuda")}
                disabled={accesoPremiumBloqueado}
              >
                Ayuda
              </button>

              <button
                className="boton2"
                onClick={() => navegarPremium("/publicaciones")}
                disabled={accesoPremiumBloqueado}
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

        {puedeVerVideoPublico && (
          <div className="m-2 w-100">
            <div className="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3 queue-panel">
              <h2 className="text-white queue-title">Canciones a la cola</h2>

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
                      irASeccion("video");
                    }}
                    className="song-icon position-relative"
                    style={{ cursor: "pointer" }}
                  >
                    <FaCompactDisc
                      size={40}
                      className={`mb-1 ${
                        colaActivaEnPlayer && index === currentIndex
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
                ))}
              </div>

              {tieneAccesoKaraoke && (
                <button className="btn" onClick={limpiarCola}>
                  <img className="m-2" src="/limpiar.png" alt="" width={120} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {mostrarSuscripcionCentral && !tieneAccesoKaraoke && (
        <div
          className="registered-subscribe-center"
          role="dialog"
          aria-modal="false"
          aria-live="polite"
        >
          <button
            type="button"
            className="registered-subscribe-center-button"
            onClick={() => irASeccion("suscribir")}
          >
            Suscribirse
          </button>
        </div>
      )}

      {showGuestRegisterModal && esInvitado && (
        <div
          className="guest-register-modal-backdrop"
          role="dialog"
          aria-modal="false"
          aria-live="polite"
        >
          <div className="guest-register-modal">
            <p>Deseas seguir cantando por favor registrate..</p>

            <div className="guest-register-modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowGuestRegisterModal(false);
                  irASeccion("registrar");
                }}
              >
                Registrarme
              </button>

              <button
                type="button"
                className="btn btn-light"
                onClick={() => {
                  setShowGuestRegisterModal(false);
                  irASeccion("ingresar");
                }}
              >
                Ingresar
              </button>

              <button
                type="button"
                className="btn btn-outline-light"
                onClick={() => setShowGuestRegisterModal(false)}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fondo p-2">
        <AnunciosVisibles />

        <h1 className="p-2 text-white">Recomendados</h1>
        <VideoCarouselVisibles
          onPlaySolo={activarPantallaCompletaPlayer}
          onFirstQueueSongAdded={reproducirPrimeraCancionDeCola}
          tieneAccesoKaraoke={tieneAccesoKaraoke}
        />

        <h1 className="p-2 text-white">Las más populares</h1>
        <VideoCarousel
          onPlaySolo={activarPantallaCompletaPlayer}
          onFirstQueueSongAdded={reproducirPrimeraCancionDeCola}
          tieneAccesoKaraoke={tieneAccesoKaraoke}
        />
      </div>

      {!cargandoSuscripcion && !tieneAccesoKaraoke && <WhatsAppButton />}
    </>
  );
}
