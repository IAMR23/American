import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactPlayer from "react-player";
import "../styles/react-player.css";
import BarraDeslizante from "./BarraDeslizante";
import { API_URL } from "../config";
import axios from "axios";

const API_PUNTAJE = `${API_URL}/p/puntaje`;

export default function VideoPlayer({
  cola = [],
  currentIndex,
  setCurrentIndex,
  fullscreenRequested = false,
  onFullscreenHandled,
  onColaTerminada,
  modoCalificacion = false,
}) {
  const playlist = cola || [];

  const [showNextMessage, setShowNextMessage] = useState(false);
  const [nextSongName, setNextSongName] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeoutRef = useRef(null);

  const [calificaciones, setCalificaciones] = useState([]);

  // 🔥 VIDEO ACTUAL DE CALIFICACIÓN
  const [videoCalificacion, setVideoCalificacion] = useState(null);

  // 🔥 PARA SABER SI EL USUARIO INTERVINO POR TECLA
  const [calificacionForzada, setCalificacionForzada] = useState(false);

  const playerRef = useRef();
  const containerRef = useRef();

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
      const last = shuffled.length ? shuffled[shuffled.length - 1].calificacion : null;
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
      console.log(item)
      if (!item) return;

      setVideoCalificacion(item);
      setCalificacionForzada(true);

      playerRef.current?.seekTo(0);
      setIsPlaying(true);
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

  // ============================================================
  //  CAMBIO VIDEO COLA
  // ============================================================
  const currentVideo = playlist[currentIndex];

  useEffect(() => {
    if (!currentVideo) return;

    setIsPlaying(false);
    playerRef.current?.seekTo(0);
    setTimeout(() => setIsPlaying(true), 20);
  }, [currentIndex]);

  // ============================================================
  //  BOTONES NAVEGACIÓN
  // ============================================================
  const nextVideo = () => {
    if (currentIndex < playlist.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowNextMessage(false);
    }
  };

  const prevVideo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
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
      const next = playlist[currentIndex + 1];
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

    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);

    if (isFullscreen) {
      hideControlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
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
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
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

  // ============================================================
  //  CUANDO EL VIDEO TERMINA
  // ============================================================
  const handleEnded = () => {
    // 🔥 SI ESTOY REPRODUCIENDO UN VIDEO QUE EL USUARIO FORZÓ POR TECLA
    if (calificacionForzada && videoCalificacion) {
      setVideoCalificacion(null);
      setCalificacionForzada(false);
      refillPool(); // restaurar pesos normales

      return; // no avanzar la cola
    }

    // 🔥 SI ES UN VIDEO NORMAL DE CALIFICACIÓN
    if (modoCalificacion && !videoCalificacion) {
      const v = getVideoByWeightNoRepeat();
      setVideoCalificacion(v);
      playerRef.current.seekTo(0);
      return;
    }

    // 🔥 SI TERMINÓ UN VIDEO CALIFICACIÓN NORMAL
    if (videoCalificacion) {
      setVideoCalificacion(null);

      if (currentIndex < playlist.length - 1) {
        setCurrentIndex(currentIndex + 1);
        return;
      }

      onColaTerminada?.();
      return;
    }

    // 🔥 FLUJO NORMAL
    if (currentIndex < playlist.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onColaTerminada?.();
    }
  };

  // ============================================================
  //  RENDER
  // ============================================================
  return (
    <div
      ref={containerRef}
      style={{
        margin: "auto",
        position: "relative",
        background: "#000",
        height: isFullscreen ? "100vh" : "auto",
      }}
    >
      <div style={{ position: "relative" }}>
        <ReactPlayer
          className="react-player"
          ref={playerRef}
          url={videoCalificacion ? videoCalificacion.videoUrl : currentVideo.videoUrl}
          playing={isPlaying}
          controls={false}
          width="100%"
          height={isFullscreen ? "100vh" : "85vh"}
          onProgress={handleProgress}
          onDuration={(d) => setDuration(d)}
          onEnded={handleEnded}
        />

        {/* NAV LEFT */}
        <img
          src="izq.png"
          alt="Anterior"
          onClick={currentIndex === 0 ? undefined : prevVideo}
          style={{
            ...navButtonStyle("left", currentIndex === 0),
            cursor: currentIndex === 0 ? "not-allowed" : "pointer",
            opacity: currentIndex === 0 ? 0.5 : 1,
          }}
        />

        {/* NAV RIGHT */}
        <img
          src="der.png"
          alt="Siguiente"
          onClick={currentIndex === playlist.length - 1 ? undefined : nextVideo}
          style={{
            ...navButtonStyle("right", currentIndex === playlist.length - 1),
            cursor: currentIndex === playlist.length - 1 ? "not-allowed" : "pointer",
            opacity: currentIndex === playlist.length - 1 ? 0.5 : 1,
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
                background: "rgba(0,0,0,0.6)",
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

            <span style={{ fontSize: "14px", minWidth: "45px" }}>{formatTime(progress)}</span>

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

            <span style={{ fontSize: "14px", minWidth: "45px" }}>{formatTime(duration)}</span>

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
                  <img className="m-2" src="/ci.png" alt="" width={isFullscreen ? 45 : 30} />

                  <span className="outlined">Próxima canción: </span>

                  <span style={{ fontSize: "120%" }} className="outlined-white">
                    {nextSongName}
                  </span>

                  <img className="m-2" src="/cd.png" alt="" width={isFullscreen ? 40 : 25} />
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
