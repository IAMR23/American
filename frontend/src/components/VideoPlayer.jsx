import React, { useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";
import "../styles/react-player.css";
import BarraDeslizante from "./BarraDeslizante";

export default function VideoPlayer({
  cola = [],
  currentIndex,
  setCurrentIndex,
  fullscreenRequested = false,
  onFullscreenHandled,
  onColaTerminada,
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

  const playerRef = useRef();
  const containerRef = useRef();

  const currentVideo = playlist[currentIndex];

  // --- FULLSCREEN ---
  useEffect(() => {
    if (fullscreenRequested) {
      const el = containerRef.current;
      if (el && !document.fullscreenElement) {
        el.requestFullscreen?.();
      }
      if (onFullscreenHandled) onFullscreenHandled();
    }
  }, [fullscreenRequested, onFullscreenHandled]);

  // --- LOOP INDEX ---
  useEffect(() => {
    if (currentIndex >= playlist.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, playlist.length, setCurrentIndex]);

  // --- CAMBIO DE CANCIÓN ---
  useEffect(() => {
    if (!currentVideo) return;
    setIsPlaying(false);
    if (playerRef.current) {
      playerRef.current.seekTo(0);
    }
    setIsPlaying(true);
  }, [currentIndex]);

  // --- NAVIGATION ---
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

  // --- PROGRESS ---
  const handleProgress = ({ playedSeconds }) => {
    setProgress(playedSeconds);
    const dur = playerRef.current?.getDuration?.();
    if (!dur) return;

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
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // --- CONTROLES AUTOMÁTICOS EN FULLSCREEN ---
  const resetHideControlsTimer = () => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    if (isFullscreen) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    const handleMouseMove = () => resetHideControlsTimer();
    const container = containerRef.current;
    container?.addEventListener("mousemove", handleMouseMove);

    return () => {
      container?.removeEventListener("mousemove", handleMouseMove);
      if (hideControlsTimeoutRef.current)
        clearTimeout(hideControlsTimeoutRef.current);
    };
  }, [isFullscreen]);

  // --- FULLSCREEN STATE ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      setIsFullscreen(!!fsElement);
      if (!!fsElement) resetHideControlsTimer();
      else setShowControls(true);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // --- RENDER ---
  if (!Array.isArray(cola) || cola.length === 0) {
    return (
      <div style={emptyStyle}>
        🎧 No hay canciones en la cola. Añade una desde el buscador o playlist.
      </div>
    );
  }

  if (!currentVideo || !currentVideo.videoUrl) {
    return (
      <div style={emptyStyle}>
        ⚠️ Esta canción no tiene un video disponible para reproducir.
      </div>
    );
  }

  // --- CUANDO TERMINA UN VIDEO ---
  const handleEnded = () => {
    if (currentIndex < playlist.length - 1) {
      // ✅ Aún hay canciones en la cola
      setCurrentIndex(currentIndex + 1);
    } else {
      // ⚠️ Cola terminada
      if (onColaTerminada) {
        onColaTerminada(); // avisa al componente padre
      }
    }
  };

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
          url={currentVideo.videoUrl || ""}
          playing={isPlaying}
          controls={false}
          width="100%"
          height={isFullscreen ? "100vh" : "85vh"}
          onPause
          onProgress={handleProgress}
          onDuration={(d) => setDuration(d)}
           onEnded={handleEnded}
        />

        {/* Botones navegación */}

        <img
          src="izq.png" // reemplaza con tu imagen
          alt="Anterior"
          onClick={currentIndex === 0 ? undefined : prevVideo}
          style={{
            ...navButtonStyle("left", currentIndex === 0),
            cursor: currentIndex === 0 ? "not-allowed" : "pointer",
            opacity: currentIndex === 0 ? 0.5 : 1,
          }}
        />

        <img
          src="der.png" // reemplaza con tu imagen
          alt="Siguiente"
          onClick={currentIndex === playlist.length - 1 ? undefined : nextVideo}
          style={{
            ...navButtonStyle("right", currentIndex === playlist.length - 1),
            cursor:
              currentIndex === playlist.length - 1 ? "not-allowed" : "pointer",
            opacity: currentIndex === playlist.length - 1 ? 0.5 : 1,
          }}
        />

        {/* Barra de controles personalizada */}
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
            {/* Play/Pause */}
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

            {/* Tiempo transcurrido */}
            <span style={{ fontSize: "14px", minWidth: "45px" }}>
              {formatTime(progress)}
            </span>

            {/* Barra progreso */}
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

            {/* Tiempo total */}
            <span style={{ fontSize: "14px", minWidth: "45px" }}>
              {formatTime(duration)}
            </span>

            {/* Fullscreen */}
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
                whiteSpace: "nowrap",
              }}
            >
              ⛶
            </button>
          </div>
        )}

        {showNextMessage && (
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

// --- ESTILOS ---
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
