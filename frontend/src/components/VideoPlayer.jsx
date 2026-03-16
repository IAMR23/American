import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactPlayer from "react-player";
import "../styles/react-player.css";
import BarraDeslizante from "./BarraDeslizante";
import { API_URL } from "../config";
import axios from "axios";

const API_PUNTAJE = `${API_URL}/p/puntaje`;

export default function VideoPlayer({
  cola = [],
  esColaDefault = false, // 🎵 Nuevo: indica si estamos usando colaDefault
  currentIndex,
  setCurrentIndex,
  fullscreenRequested = false,
  onFullscreenHandled,
  onColaTerminada,
  modoCalificacion = false,
}) {
  const playlist = cola || [];

  // 🎵 Índice local para colaDefault (no se sincroniza con socket)
  const [localIndexDefault, setLocalIndexDefault] = useState(0);

  const [showNextMessage, setShowNextMessage] = useState(false);
  const [nextSongName, setNextSongName] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);

  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeoutRef = useRef(null);

  const [calificaciones, setCalificaciones] = useState([]);

  // 🔥 VIDEO ACTUAL DE CALIFICACIÓN
  const [videoCalificacion, setVideoCalificacion] = useState(null);

  // 🔥 PARA SABER SI EL USUARIO INTERVINO POR TECLA
  const [calificacionForzada, setCalificacionForzada] = useState(false);

  const playerRef = useRef();
  const containerRef = useRef();
  const autoplayInitiatedRef = useRef(false);
  const [colaCalificaciones, setColaCalificaciones] = useState([]);

  const insertarVideoDespuesActual = (video) => {
    if (!video) return;

    setColaCalificaciones((prev) => [...prev, { ...video, esForzado: true }]);
  };

  useEffect(() => {
    if (!videoCalificacion) return;

    // asegurarnos que el player cargue el nuevo url y comience desde 0
    setIsPlaying(false);
    setTimeout(() => {
      try {
        playerRef.current?.seekTo(0);
      } catch (e) {}
      setIsPlaying(true);
    }, 20);
  }, [videoCalificacion]);

  const obtenerPuntajes = async () => {
    try {
      const res = await axios.get(API_PUNTAJE);
      setCalificaciones(res.data);
    } catch (error) {
      console.error("Error al obtener los puntajes:", error);
    }
  };

  useEffect(() => {
    obtenerPuntajes();
  }, []);

  // ============================================================
  //  POOL DE PESOS
  // ============================================================
  const poolRef = useRef([]);

  const refillPool = useCallback(() => {
    if (!Array.isArray(calificaciones) || calificaciones.length === 0) {
      poolRef.current = [];
      return;
    }

    let pool = [];

    calificaciones.forEach((item) => {
      const count = Math.round(item.weight);
      for (let i = 0; i < count; i++) pool.push(item);
    });

    // Mezclar evitando repetición consecutiva
    const shuffled = [];
    const tempPool = [...pool];

    while (tempPool.length > 0) {
      const last = shuffled.length
        ? shuffled[shuffled.length - 1].calificacion
        : null;
      const candidates = tempPool.filter((v) => v.calificacion !== last);

      const pickPool = candidates.length ? candidates : tempPool;

      const index = Math.floor(Math.random() * pickPool.length);
      const selected = pickPool[index];
      shuffled.push(selected);

      const removeIndex = tempPool.findIndex((v) => v === selected);
      tempPool.splice(removeIndex, 1);
    }

    poolRef.current = shuffled;
  }, [calificaciones]);

  const getVideoByWeightNoRepeat = useCallback(() => {
    if (!poolRef.current || poolRef.current.length === 0) {
      refillPool();
    }
    return poolRef.current.shift();
  }, [refillPool]);

  useEffect(() => {
    refillPool();
  }, [calificaciones]);

  // ============================================================
  //  TECLAS PRESIONADAS (1–9)
  // ============================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!modoCalificacion) return; // solo funciona en modo calificación
      if (videoCalificacion) return; // si ya hay video, ignorar

      const key = e.key;

      if (!/^[1-9]$/.test(key)) return;

      const item = calificaciones.find((c) => String(c.key) === key);
      console.log(item);
      if (!item) return;

      insertarVideoDespuesActual(item);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [calificaciones, modoCalificacion, videoCalificacion]);

  // ============================================================
  //  FULLSCREEN
  // ============================================================
  useEffect(() => {
    if (fullscreenRequested) {
      const el = containerRef.current;
      if (el && !document.fullscreenElement) {
        el.requestFullscreen?.();
      }
      onFullscreenHandled?.();
    }
  }, [fullscreenRequested, onFullscreenHandled]);

  // 🎵 Resetear localIndexDefault cuando se cambia a colaDefault
  useEffect(() => {
    if (esColaDefault) {
      setLocalIndexDefault(0);
    } else {
      // Si salimos de colaDefault, resetear el flag para la próxima vez
      autoplayInitiatedRef.current = false;
    }
  }, [esColaDefault]);

  // 🎵 Detener reproducción cuando la cola se vacía (por logout / reset)
  useEffect(() => {
    if (!cola.length) {
      setIsPlaying(false);
      setVideoCalificacion(null);
      setColaCalificaciones([]);
      setProgress(0);
    }
  }, [cola.length]);

  // ============================================================
  //  ÍNDICE EFECTIVO (usa el correcto según el tipo de cola)
  // ============================================================
  const effectiveIndex = esColaDefault ? localIndexDefault : currentIndex;

  const setEffectiveIndex = (newIndex) => {
    if (esColaDefault) {
      setLocalIndexDefault(newIndex);
    } else {
      setCurrentIndex(newIndex);
    }
  };

  // 🎵 Video actual basado en el índice efectivo
  const currentVideo = playlist[effectiveIndex];

  // 🎵 AUTOPLAY: Cuando se carga colaDefault por primera vez
  useEffect(() => {
    if (esColaDefault && playlist.length > 0 && !autoplayInitiatedRef.current) {
      autoplayInitiatedRef.current = true;
      const timer = setTimeout(() => {
        setIsPlaying(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [esColaDefault, playlist.length]);

  // 🎵 Cuando el video cambias, asegurar que siga reproduciendo en colaDefault
  useEffect(() => {
    if (esColaDefault && currentVideo) {
      setIsPlaying(true);
    }
  }, [currentVideo, esColaDefault]);

  // 🎵 Agresivo: Si cola tiene contenido y estamos en colaDefault, reproducir
  useEffect(() => {
    if (esColaDefault && cola.length > 0) {
      const timer = setTimeout(() => {
        setIsPlaying(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [cola.length, esColaDefault]);

  // ============================================================
  //  BOTONES NAVEGACIÓN
  // ============================================================
  const nextVideo = () => {
    if (effectiveIndex < playlist.length - 1) {
      setEffectiveIndex(effectiveIndex + 1);
      setShowNextMessage(false);
    }
  };

  const prevVideo = () => {
    if (effectiveIndex > 0) {
      setEffectiveIndex(effectiveIndex - 1);
      setShowNextMessage(false);
    }
  };

  // ============================================================
  //  PROGRESO
  // ============================================================
  const handleProgress = ({ playedSeconds }) => {
    setProgress(playedSeconds);

    const dur = playerRef.current?.getDuration?.();
    if (!dur) return;

    // 🔥 OCULTAR mensaje si es videoCalificacion
    if (videoCalificacion) {
      setShowNextMessage(false);
      return;
    }

    if (dur - playedSeconds <= 40) {
      const next = playlist[effectiveIndex + 1];
      if (next) {
        setNextSongName(next.titulo || "Siguiente canción");
        setShowNextMessage(true);
      }
    } else {
      setShowNextMessage(false);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    playerRef.current.seekTo(newTime, "seconds");
    setProgress(newTime);
  };

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ============================================================
  //  OCULTAR CONTROLES
  // ============================================================
  const resetHideControlsTimer = () => {
    setShowControls(true);

    if (hideControlsTimeoutRef.current)
      clearTimeout(hideControlsTimeoutRef.current);

    if (isFullscreen) {
      hideControlsTimeoutRef.current = setTimeout(
        () => setShowControls(false),
        3000,
      );
    }
  };

  useEffect(() => {
    const handleMouseMove = () => resetHideControlsTimer();
    const container = containerRef.current;

    container?.addEventListener("mousemove", handleMouseMove);

    return () => {
      container?.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(hideControlsTimeoutRef.current);
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement = document.fullscreenElement;
      setIsFullscreen(!!fsElement);
      if (fsElement) resetHideControlsTimer();
      else setShowControls(true);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  // ============================================================
  //  NO HAY VIDEOS
  // ============================================================
  if (!Array.isArray(cola) || cola.length === 0) {
    return <div style={emptyStyle}>🎧 No hay canciones en la cola.</div>;
  }

  if (!currentVideo || !currentVideo.videoUrl) {
    return <div style={emptyStyle}>⚠️ Canción sin video disponible.</div>;
  }

  const handleEnded = () => {
    console.log(
      `🎵 Canción terminada. Index: ${effectiveIndex}, Playlist length: ${playlist.length}, esColaDefault: ${esColaDefault}`
    );

    // 1️⃣ Si hay un video forzado en la cola → reproducirlo
    if (colaCalificaciones.length > 0) {
      const siguiente = colaCalificaciones[0];
      setColaCalificaciones(colaCalificaciones.slice(1));

      setVideoCalificacion(siguiente);
      playerRef.current.seekTo(0);
      return;
    }

    // 2️⃣ Si es videoCalificación NORMAL
    if (videoCalificacion) {
      setVideoCalificacion(null);

      // avanzar la cola de karaoke
      if (effectiveIndex < playlist.length - 1) {
        setEffectiveIndex(effectiveIndex + 1);
        return;
      }

      onColaTerminada?.();
      return;
    }

    // 3️⃣ Si estoy en modo calificación, insertar uno random después del karaoke
    if (modoCalificacion && !videoCalificacion) {
      const random = getVideoByWeightNoRepeat();
      setVideoCalificacion(random);
      playerRef.current.seekTo(0);
      return;
    }

    // 4️⃣ Flujo normal del karaoke
    if (effectiveIndex < playlist.length - 1) {
      const nextIndex = effectiveIndex + 1;
      console.log(
        `⏭️ Avanzando a siguiente canción: ${nextIndex} (esColaDefault: ${esColaDefault})`
      );
      // ✅ Cuando es colaDefault, simplemente incrementar el índice local
      // ✅ Cuando es cola real, esto emitirá al socket a través de setCurrentIndex
      setEffectiveIndex(nextIndex);
    } else {
      // ⚠️ Si llegamos al final
      console.log(`🏁 Fin de cola, llamando onColaTerminada`);
      onColaTerminada?.();
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        margin: "auto",
        position: "relative",
        background: "#000",
        width: "100%",
        aspectRatio: "16 / 9",
        height: isFullscreen ? "100vh" : undefined,
        overflow: "hidden",
      }}
    >
{/*       {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#999",
            zIndex: 2,
          }}
        >
          Cargando video…
        </div>
      )} */}

      <div className="player-wrapper" /* style={{ position: "relative" }} */>
      
      <ReactPlayer
        key={
          videoCalificacion
            ? videoCalificacion.videoUrl
            : currentVideo.videoUrl
        }
        ref={playerRef}
        url={
          videoCalificacion
            ? videoCalificacion.videoUrl
            : currentVideo.videoUrl
        }
        playing={isPlaying}
        controls={false}
        width="100%"
        height="100%"
        stopOnUnmount={true}
        onProgress={handleProgress}
        onDuration={setDuration}
        onEnded={handleEnded}
      />

        <img
          src="izq.png"
          alt="Anterior"
          onClick={effectiveIndex === 0 ? undefined : prevVideo}
          style={{
            ...navButtonStyle("left", effectiveIndex === 0),
            cursor: effectiveIndex === 0 ? "not-allowed" : "pointer",
            opacity: effectiveIndex === 0 ? 0.5 : 1,
          }}
        />

        {/* NAV RIGHT */}
        <img
          src="der.png"
          alt="Siguiente"
          onClick={effectiveIndex === playlist.length - 1 ? undefined : nextVideo}
          style={{
            ...navButtonStyle("right", effectiveIndex === playlist.length - 1),
            cursor:
              effectiveIndex === playlist.length - 1 ? "not-allowed" : "pointer",
            opacity: effectiveIndex === playlist.length - 1 ? 0.5 : 1,
          }}
        />

        {/* CONTROLES */}
        {showControls && (
          <div
            style={{
              position: "absolute",
              bottom: "15px",
              left: "0",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              padding: "0 15px",
              color: "white",
              transition: "opacity 0.3s",
            }}
          >
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: "rgba(0,0,0,0)",
                color: "white",
                border: "none",
                padding: "10px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "20px",
              }}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>

            <span style={{ fontSize: "14px", minWidth: "45px" }}>
              {formatTime(progress)}
            </span>

            <input
              type="range"
              min={0}
              max={duration}
              step="0.1"
              value={progress}
              onChange={handleSeek}
              style={{
                flex: 1,
                height: "6px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            />

            <span style={{ fontSize: "14px", minWidth: "45px" }}>
              {formatTime(duration)}
            </span>

            <button
              onClick={toggleFullscreen}
              style={{
                background: "rgba(0,0,0,0.6)",
                color: "white",
                border: "none",
                padding: "8px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              ⛶
            </button>
          </div>
        )}

        {/* 🔥 OCULTAR PRÓXIMA CANCIÓN SI HAY videoCalificacion */}
        {showNextMessage && !videoCalificacion && (
          <BarraDeslizante
            texto={
              <>
                <div className="d-flex justify-content-center align-items-center ">
                  <img
                    className="m-2"
                    src="/ci.png"
                    alt=""
                    width={isFullscreen ? 45 : 30}
                  />

                  <span className="outlined">Próxima canción: </span>

                  <span style={{ fontSize: "120%" }} className="outlined-white">
                    {nextSongName}
                  </span>

                  <img
                    className="m-2"
                    src="/cd.png"
                    alt=""
                    width={isFullscreen ? 40 : 25}
                  />
                </div>
              </>
            }
            isFullscreen={isFullscreen}
          />
        )}
      </div>
    </div>
  );
}

// ======================
// ESTILOS
// ======================
const emptyStyle = {
  background: "#000",
  color: "white",
  padding: "20px",
  textAlign: "center",
  borderRadius: "10px",
};

const navButtonStyle = (side, disabled) => ({
  position: "absolute",
  top: "50%",
  [side]: "10px",
  transform: "translateY(-50%)",
  width: "50px",
  height: "50px",
  color: "white",
  border: "none",
  borderRadius: "50%",
  fontSize: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: disabled ? "not-allowed" : "pointer",
});
