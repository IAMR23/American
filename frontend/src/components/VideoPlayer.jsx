import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactPlayer from "react-player";
import "../styles/react-player.css";
import BarraDeslizante from "./BarraDeslizante";
import { API_URL } from "../config";
import axios from "axios";

const API_PUNTAJE = `${API_URL}/p/puntaje`;

export default function VideoPlayer({
  cola = [],
  esColaDefault = false,
  currentIndex,
  setCurrentIndex,
  fullscreenRequested = false,
  onFullscreenHandled,
  onColaTerminada,
  modoCalificacion = false,
}) {
  const playlist = Array.isArray(cola) ? cola : [];

  const [localIndexDefault, setLocalIndexDefault] = useState(0);
  const [showNextMessage, setShowNextMessage] = useState(false);
  const [nextSongName, setNextSongName] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [calificaciones, setCalificaciones] = useState([]);
  const [videoCalificacion, setVideoCalificacion] = useState(null);
  const [colaCalificaciones, setColaCalificaciones] = useState([]);
  const [playerInstanceKey, setPlayerInstanceKey] = useState(0);

  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);
  const autoplayInitiatedRef = useRef(false);
  const poolRef = useRef([]);
  const switchingRef = useRef(false);
  const endedLockRef = useRef(false);

  const effectiveIndex = esColaDefault ? localIndexDefault : currentIndex;
  const currentVideo = playlist[effectiveIndex];

  const activeVideo = videoCalificacion || currentVideo;
  const activeUrl = activeVideo?.videoUrl || "";

  const playerKey = videoCalificacion
    ? `calificacion-${activeVideo?.id || activeUrl}-${playerInstanceKey}`
    : `main-${currentVideo?.id || activeUrl}-${effectiveIndex}-${playerInstanceKey}`;

  const setEffectiveIndex = useCallback(
    (newIndex) => {
      if (esColaDefault) {
        setLocalIndexDefault(newIndex);
      } else {
        setCurrentIndex?.(newIndex);
      }
    },
    [esColaDefault, setCurrentIndex]
  );

  const safeSwitch = useCallback((callback) => {
    if (switchingRef.current) return;

    switchingRef.current = true;
    endedLockRef.current = true;

    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setShowNextMessage(false);

    try {
      playerRef.current?.seekTo?.(0, "seconds");
    } catch (error) {
      console.warn("No se pudo detener el video anterior:", error);
    }

    setTimeout(() => {
      callback?.();

      setPlayerInstanceKey((prev) => prev + 1);

      setTimeout(() => {
        endedLockRef.current = false;
        switchingRef.current = false;
        setIsPlaying(true);
      }, 450);
    }, 250);
  }, []);

  const obtenerPuntajes = async () => {
    try {
      const res = await axios.get(API_PUNTAJE);
      setCalificaciones(res.data || []);
    } catch (error) {
      console.error("Error al obtener los puntajes:", error);
    }
  };

  useEffect(() => {
    obtenerPuntajes();
  }, []);

  const refillPool = useCallback(() => {
    if (!Array.isArray(calificaciones) || calificaciones.length === 0) {
      poolRef.current = [];
      return;
    }

    const pool = [];

    calificaciones.forEach((item) => {
      const count = Math.max(1, Math.round(Number(item.weight) || 1));
      for (let i = 0; i < count; i++) pool.push(item);
    });

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
  }, [refillPool]);

  const insertarVideoDespuesActual = useCallback((video) => {
    if (!video?.videoUrl) return;

    setColaCalificaciones((prev) => [...prev, { ...video, esForzado: true }]);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!modoCalificacion) return;
      if (videoCalificacion) return;
      if (switchingRef.current) return;

      const key = e.key;

      if (!/^[1-9]$/.test(key)) return;

      const item = calificaciones.find((c) => String(c.key) === key);
      if (!item) return;

      insertarVideoDespuesActual(item);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    calificaciones,
    modoCalificacion,
    videoCalificacion,
    insertarVideoDespuesActual,
  ]);

  useEffect(() => {
    if (fullscreenRequested) {
      const el = containerRef.current;

      if (el && !document.fullscreenElement) {
        el.requestFullscreen?.();
      }

      onFullscreenHandled?.();
    }
  }, [fullscreenRequested, onFullscreenHandled]);

  useEffect(() => {
    if (esColaDefault) {
      setLocalIndexDefault(0);
      autoplayInitiatedRef.current = false;
    } else {
      autoplayInitiatedRef.current = false;
    }
  }, [esColaDefault]);

  useEffect(() => {
    if (!playlist.length) {
      setIsPlaying(false);
      setVideoCalificacion(null);
      setColaCalificaciones([]);
      setProgress(0);
      setDuration(0);
      setShowNextMessage(false);
      autoplayInitiatedRef.current = false;
    }
  }, [playlist.length]);

  useEffect(() => {
    if (playlist.length > 0 && !autoplayInitiatedRef.current) {
      autoplayInitiatedRef.current = true;
      setIsPlaying(true);
    }
  }, [playlist.length]);

  useEffect(() => {
    setProgress(0);
    setDuration(0);
    setShowNextMessage(false);

    try {
      playerRef.current?.seekTo?.(0, "seconds");
    } catch (error) {
      console.warn("No se pudo reiniciar el video:", error);
    }
  }, [activeUrl]);

  const nextVideo = () => {
    if (switchingRef.current) return;

    if (effectiveIndex < playlist.length - 1) {
      safeSwitch(() => {
        setVideoCalificacion(null);
        setColaCalificaciones([]);
        setEffectiveIndex(effectiveIndex + 1);
      });
    }
  };

  const prevVideo = () => {
    if (switchingRef.current) return;

    if (effectiveIndex > 0) {
      safeSwitch(() => {
        setVideoCalificacion(null);
        setColaCalificaciones([]);
        setEffectiveIndex(effectiveIndex - 1);
      });
    }
  };

  const handleProgress = ({ playedSeconds }) => {
    if (switchingRef.current) return;

    setProgress(playedSeconds);

    const dur = playerRef.current?.getDuration?.();
    if (!dur) return;

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

    try {
      playerRef.current?.seekTo?.(newTime, "seconds");
    } catch (error) {
      console.warn("No se pudo mover el video:", error);
    }

    setProgress(newTime);
  };

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return "00:00";

    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);

    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  const handleEnded = () => {
    if (endedLockRef.current || switchingRef.current) return;

    endedLockRef.current = true;

    setTimeout(() => {
      endedLockRef.current = false;
    }, 1200);

    if (colaCalificaciones.length > 0) {
      const siguiente = colaCalificaciones[0];

      safeSwitch(() => {
        setColaCalificaciones((prev) => prev.slice(1));
        setVideoCalificacion(siguiente);
      });

      return;
    }

    if (videoCalificacion) {
      safeSwitch(() => {
        setVideoCalificacion(null);

        if (effectiveIndex < playlist.length - 1) {
          setEffectiveIndex(effectiveIndex + 1);
        } else if (esColaDefault) {
          setEffectiveIndex(0);
        } else {
          onColaTerminada?.();
        }
      });

      return;
    }

    if (modoCalificacion) {
      const random = getVideoByWeightNoRepeat();

      if (random?.videoUrl) {
        safeSwitch(() => {
          setVideoCalificacion(random);
        });

        return;
      }
    }

    safeSwitch(() => {
      if (effectiveIndex < playlist.length - 1) {
        setEffectiveIndex(effectiveIndex + 1);
      } else if (esColaDefault) {
        setEffectiveIndex(0);
      } else {
        setIsPlaying(false);
        onColaTerminada?.();
      }
    });
  };

  const resetHideControlsTimer = useCallback(() => {
    setShowControls(true);

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    if (isFullscreen) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleMouseMove = () => resetHideControlsTimer();
    const container = containerRef.current;

    container?.addEventListener("mousemove", handleMouseMove);

    return () => {
      container?.removeEventListener("mousemove", handleMouseMove);

      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [resetHideControlsTimer]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement = document.fullscreenElement;

      setIsFullscreen(!!fsElement);

      if (fsElement) {
        resetHideControlsTimer();
      } else {
        setShowControls(true);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [resetHideControlsTimer]);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  if (!playlist.length) {
    return <div style={emptyStyle}>🎧 No hay canciones en la cola.</div>;
  }

  if (!currentVideo?.videoUrl) {
    return <div style={emptyStyle}>⚠️ Canción sin video disponible.</div>;
  }

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
      <div className="player-wrapper">
        <ReactPlayer
          key={playerKey}
          ref={playerRef}
          url={activeUrl}
          playing={isPlaying}
          controls={false}
          width="100%"
          height="100%"
          stopOnUnmount={true}
          playsinline
          onReady={() => {
            // No forzar setIsPlaying(true) aquí.
            // Eso podía causar solapamiento entre videos.
          }}
          onProgress={handleProgress}
          onDuration={setDuration}
          onEnded={handleEnded}
          config={{
            youtube: {
              playerVars: {
                autoplay: 1,
                controls: 0,
                rel: 0,
                modestbranding: 1,
              },
            },
            file: {
              attributes: {
                controlsList: "nodownload",
              },
            },
          }}
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

        <img
          src="der.png"
          alt="Siguiente"
          onClick={
            effectiveIndex === playlist.length - 1 ? undefined : nextVideo
          }
          style={{
            ...navButtonStyle("right", effectiveIndex === playlist.length - 1),
            cursor:
              effectiveIndex === playlist.length - 1
                ? "not-allowed"
                : "pointer",
            opacity: effectiveIndex === playlist.length - 1 ? 0.5 : 1,
          }}
        />

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
              zIndex: 5,
            }}
          >
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
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
              max={duration || 0}
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

        {showNextMessage && !videoCalificacion && (
          <BarraDeslizante
            texto={
              <>
                <div className="d-flex justify-content-center align-items-center">
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
  zIndex: 4,
});