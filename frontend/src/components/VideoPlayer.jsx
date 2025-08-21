import React, { useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";
import { PitchDetector } from "pitchy";
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
  const [isPlaying, setIsPlaying] = useState(false); // 👈 control de reproducción
  const [score, setScore] = useState(null);
  const [scoreCalculated, setScoreCalculated] = useState(false);

  const playerRef = useRef();
  const containerRef = useRef();

  // Pitch detection refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const userPitchesRef = useRef([]);

  const currentVideo = playlist[currentIndex];

  // --- MICRÓFONO ---
  const startMic = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaStreamSource(stream);

    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;
    source.connect(analyserRef.current);

    detectorRef.current = PitchDetector.forFloat32Array(
      analyserRef.current.fftSize
    );
    userPitchesRef.current = [];
    capturePitch();
  };

  const capturePitch = () => {
    const input = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(input);

    const [pitch, clarity] = detectorRef.current.findPitch(
      input,
      audioContextRef.current.sampleRate
    );

    if (clarity > 0.5) {
      userPitchesRef.current.push(pitch);
    }

    rafRef.current = requestAnimationFrame(capturePitch);
  };

  const stopMic = () => {
    cancelAnimationFrame(rafRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const calculateScore = () => {
    const userPitches = userPitchesRef.current;
    if (!userPitches.length) return 0;

    const songReference = new Array(userPitches.length).fill(440);

    let total = 0;
    let count = userPitches.length;

    for (let i = 0; i < count; i++) {
      let diff = Math.abs(userPitches[i] - songReference[i]);
      if (userPitches[i] === 0) {
        total += 40;
      } else if (diff < 5) {
        total += 100;
      } else if (diff < 20) {
        total += 70;
      } else {
        total += 40;
      }
    }

    return Math.round(total / count);
  };

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
    stopMic(); // parar lo anterior
    setIsPlaying(false); // pausa primero
    if (playerRef.current) {
      playerRef.current.seekTo(0); // reinicia el tiempo
    }
    setIsPlaying(true); // ahora sí reproduce la nueva
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
    const duration = playerRef.current?.getDuration?.();
    if (!duration) return;

    if (duration - playedSeconds <= 30) {
      const next = playlist[currentIndex + 1];
      if (next) {
        setNextSongName(next.titulo || "Siguiente canción");
        setShowNextMessage(true);
      }
    } else {
      setShowNextMessage(false);
    }

    if (!scoreCalculated && duration - playedSeconds <= 45) {
      const finalScore = calculateScore();
      setScore(finalScore);
      setScoreCalculated(true);
    }
  };

  // --- FULLSCREEN STATE ---
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

  // --- EVENTOS ---
  const handleSongStart = () => {
    setScore(null);
    setScoreCalculated(false);
    startMic();
  };

  const handleSongEnd = () => {
    stopMic();
    const finalScore = calculateScore();
    setScore(finalScore);
    nextVideo();
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
          playing={isPlaying}   // 👈 ahora controlado por estado
          controls
          width="100%"
          height={isFullscreen ? "100vh" : "85vh"}
          onPlay={handleSongStart}
          onPause={() => stopMic()} // si pausas, paras micrófono
          onProgress={handleProgress}
          onEnded={handleSongEnd}
        />

        {/* Botones navegación */}
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

        {/* Mensaje próxima canción */}
        {showNextMessage && (
          <div style={nextSongStyle(isFullscreen)}>
            🎶 Próxima canción: {nextSongName} 🎶
          </div>
        )}

        {/* Botón fullscreen */}
        <button onClick={toggleFullscreen} style={fullscreenBtnStyle}>
          {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        </button>

        {/* Modal puntaje */}
        {score !== null && (
          <div style={scoreModalStyle}>
            🎤 Tu puntaje: <b>{score}</b> puntos
          </div>
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

const nextSongStyle = (isFullscreen) => ({
  position: "absolute",
  top: "25%",
  left: "50%",
  color: "white",
  padding: "12px 20px",
  borderRadius: "12px",
  fontSize: isFullscreen ? "50px" : "38px",
  transform: "translateX(-50%)",
  border: "5px solid black",
});

const fullscreenBtnStyle = {
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
};

const scoreModalStyle = {
  position: "absolute",
  bottom: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  background: "rgba(0,0,0,0.8)",
  color: "white",
  padding: "15px 30px",
  borderRadius: "12px",
  fontSize: "20px",
};
