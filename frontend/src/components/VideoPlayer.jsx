import React, { useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";
import "../styles/react-player.css";

export default function VideoPlayer({
  cola = [],
  currentIndex,
  setCurrentIndex,
  fullscreenRequested = false,
  onFullscreenHandled,
}) {
  const playlist = cola || [];

  const [showNextMessage, setShowNextMessage] = useState(false);
  const [nextSongName, setNextSongName] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef();
  const containerRef = useRef();

  const currentVideo = playlist[currentIndex];

  useEffect(() => {
    if (fullscreenRequested) {
      const el = containerRef.current;
      if (el) {
        if (!document.fullscreenElement) {
          el.requestFullscreen?.();
        }
      }
      // Avisar al padre que ya manejó el fullscreen para no repetir
      if (onFullscreenHandled) onFullscreenHandled();
    }
  }, [fullscreenRequested, onFullscreenHandled]);

  useEffect(() => {
    if (currentIndex >= playlist.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, playlist.length, setCurrentIndex]);

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

  const handleProgress = ({ playedSeconds }) => {
    const duration = playerRef.current?.getDuration?.();
    if (duration && duration - playedSeconds <= 30) {
      const next = playlist[currentIndex + 1];
      if (next) {
        setNextSongName(next.titulo || "Siguiente canción");
        setShowNextMessage(true);
      }
    } else {
      setShowNextMessage(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      setIsFullscreen(!!fsElement);
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

  if (!Array.isArray(cola) || cola.length === 0) {
    return (
      <div
        style={{
          background: "#000",
          color: "white",
          padding: "20px",
          textAlign: "center",
          borderRadius: "10px",
        }}
      >
        🎧 No hay canciones en la cola. Añade una desde el buscador o playlist.
      </div>
    );
  }

  if (!currentVideo || !currentVideo.videoUrl) {
    return (
      <div
        style={{
          background: "#000",
          color: "white",
          padding: "20px",
          textAlign: "center",
          borderRadius: "10px",
        }}
      >
        ⚠️ Esta canción no tiene un video disponible para reproducir.
      </div>
    );
  }

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
      {/* {!isFullscreen && (
        <p
          style={{
            fontWeight: "bold",
            textAlign: "center",
            color: "white",
            justifyContent: "center",
          }}
        >
          💡 Mensaje del administrador: ¡Recuerda hidratarte!
        </p>
      )} */}

      <div style={{ position: "relative" }}>
        <ReactPlayer
          className="react-player"
          ref={playerRef}
          url={currentVideo.videoUrl || ""}
          controls
          playing
          width="100%"
          height={isFullscreen ? "100vh" : "85vh"}
          onProgress={handleProgress}
          onEnded={nextVideo}
          config={{
            youtube: {
              playerVars: {
                fs: 0,
              },
            },
          }}
        />

        <button
          onClick={prevVideo}
          disabled={currentIndex === 0}
          style={navButtonStyle("left", currentIndex === 0)}
        >
          ‹
        </button>

        <button
          onClick={nextVideo}
          disabled={currentIndex === playlist.length - 1}
          style={navButtonStyle("right", currentIndex === playlist.length - 1)}
        >
          ›
        </button>

        {showNextMessage && (
          <div
            className="marquee"
            style={{
              position: "absolute", // usa fixed para que sea relativo al viewport
              top: "25%", 
              left: "50%",
              backgroundColor: "rgba(0,0,0,0.8)",
              color: "white",
              padding: "12px 20px",
              borderRadius: "12px",
              fontSize: isFullscreen ? "24px" : "18px",
              zIndex: 9999,
            }}
          >
 
            <div >🎶 Próxima canción: {nextSongName}</div>
          </div>
        )}

        <button
          onClick={toggleFullscreen}
          style={{
            position: "absolute",
            top: "40px",
            right: "10px",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            border: "none",
            padding: "8px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        </button>
      </div>
    </div>
  );
}

const navButtonStyle = (side, disabled) => ({
  position: "absolute",
  top: "50%",
  [side]: "10px",
  transform: "translateY(-50%)",
  width: "50px",
  height: "50px",
  background: "rgba(0,0,0,0.5)",
  color: "white",
  border: "none",
  borderRadius: "50%",
  fontSize: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: disabled ? "not-allowed" : "pointer",
});
