import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactPlayer from "react-player";
import "../styles/react-player.css";
import BarraDeslizante from "./BarraDeslizante";
import { API_URL } from "../config";
import axios from "axios";

const API_PUNTAJE = `${API_URL}/p/puntaje`;

let activePlayerOwner = null;
let activePlayerStop = null;

const createSequentialOrder = (length) =>
  Array.from({ length }, (_, index) => index);

const createShuffledOrder = (length, avoidFirstIndex = null) => {
  const order = createSequentialOrder(length);

  for (let i = order.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [order[i], order[randomIndex]] = [order[randomIndex], order[i]];
  }

  if (order.length > 1 && order[0] === avoidFirstIndex) {
    const swapIndex = order.findIndex((index) => index !== avoidFirstIndex);
    [order[0], order[swapIndex]] = [order[swapIndex], order[0]];
  }

  return order;
};

const stopMediaElement = (element) => {
  if (!element) return;

  try {
    element.pause?.();
    element.currentTime = 0;
    element.removeAttribute?.("src");
    element.load?.();
  } catch {
    // Best effort cleanup for browser-managed media elements.
  }
};

const stopReactPlayer = (player) => {
  if (!player) return;

  try {
    player.seekTo?.(0, "seconds");
  } catch {
    // Some providers throw while their iframe is being destroyed.
  }

  try {
    const internal = player.getInternalPlayer?.();
    internal?.pauseVideo?.();
    internal?.stopVideo?.();
    internal?.pause?.();
    internal?.destroy?.();
  } catch {
    // Provider cleanup is best effort because YouTube/file players differ.
  }
};

export default function VideoPlayer({
  cola = [],
  esColaDefault = false,
  currentIndex,
  setCurrentIndex,
  fullscreenRequested = false,
  onFullscreenHandled,
  onColaTerminada,
  modoCalificacion = false,
  requestedIndex = null,
  onRequestedIndexHandled,
}) {
  const playlist = Array.isArray(cola) ? cola : [];

  const [localIndexDefault, setLocalIndexDefault] = useState(0);
  const [defaultOrder, setDefaultOrder] = useState([]);
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
  const switchTimeoutRef = useRef(null);
  const switchUnlockTimeoutRef = useRef(null);
  const endedUnlockTimeoutRef = useRef(null);
  const mountedRef = useRef(false);
  const instanceIdRef = useRef(
    `video-player-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const autoplayInitiatedRef = useRef(false);
  const poolRef = useRef([]);
  const switchingRef = useRef(false);
  const endedLockRef = useRef(false);

  const requestedCurrentIndex = Number(currentIndex);
  const normalizedCurrentIndex =
    playlist.length > 0 && Number.isFinite(requestedCurrentIndex)
      ? Math.min(Math.max(requestedCurrentIndex, 0), playlist.length - 1)
      : 0;
  const effectiveIndex = esColaDefault
    ? Math.min(localIndexDefault, Math.max(playlist.length - 1, 0))
    : normalizedCurrentIndex;
  const defaultPlaylistIndex = defaultOrder[effectiveIndex] ?? effectiveIndex;
  const currentPlaylistIndex = esColaDefault
    ? defaultPlaylistIndex
    : effectiveIndex;
  const currentVideo = playlist[currentPlaylistIndex];

  const activeVideo = videoCalificacion || currentVideo;
  const activeUrl = activeVideo?.videoUrl || "";

  const playerKey = videoCalificacion
    ? `calificacion-${activeVideo?._id || activeVideo?.id || activeUrl}-${playerInstanceKey}`
    : `main-${currentVideo?._id || currentVideo?.id || activeUrl}-${effectiveIndex}-${playerInstanceKey}`;

  const playlistSignature = playlist
    .map((video) => video?._id || video?.id || video?.videoUrl || "")
    .join("|");

  const stopCurrentPlayer = useCallback(() => {
    setIsPlaying(false);
    stopReactPlayer(playerRef.current);

    const container = containerRef.current;
    container?.querySelectorAll?.("audio, video").forEach(stopMediaElement);
  }, []);

  const clearPlayerTimers = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }

    if (switchTimeoutRef.current) {
      clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = null;
    }

    if (switchUnlockTimeoutRef.current) {
      clearTimeout(switchUnlockTimeoutRef.current);
      switchUnlockTimeoutRef.current = null;
    }

    if (endedUnlockTimeoutRef.current) {
      clearTimeout(endedUnlockTimeoutRef.current);
      endedUnlockTimeoutRef.current = null;
    }
  }, []);

  const claimActivePlayer = useCallback(() => {
    const owner = instanceIdRef.current;

    if (activePlayerOwner && activePlayerOwner !== owner) {
      activePlayerStop?.();
    }

    document.querySelectorAll("audio, video").forEach((element) => {
      if (!containerRef.current?.contains(element)) {
        stopMediaElement(element);
      }
    });

    activePlayerOwner = owner;
    activePlayerStop = stopCurrentPlayer;
  }, [stopCurrentPlayer]);

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

  const restartDefaultCycle = useCallback(() => {
    const lastPlaylistIndex = defaultOrder[effectiveIndex] ?? effectiveIndex;

    setDefaultOrder(createShuffledOrder(playlist.length, lastPlaylistIndex));
    setLocalIndexDefault(0);
  }, [defaultOrder, effectiveIndex, playlist.length]);

  const safeSwitch = useCallback((callback) => {
    if (switchingRef.current) return;

    claimActivePlayer();
    switchingRef.current = true;
    endedLockRef.current = true;

    stopCurrentPlayer();
    setProgress(0);
    setDuration(0);
    setShowNextMessage(false);

    switchTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;

      callback?.();

      setPlayerInstanceKey((prev) => prev + 1);

      switchUnlockTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;

        endedLockRef.current = false;
        switchingRef.current = false;
        claimActivePlayer();
        setIsPlaying(true);
      }, 450);
    }, 250);
  }, [claimActivePlayer, stopCurrentPlayer]);

  const obtenerPuntajes = async () => {
    try {
      const res = await axios.get(API_PUNTAJE);
      setCalificaciones(res.data || []);
    } catch (error) {
      console.error("Error al obtener los puntajes:", error);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    claimActivePlayer();

    return () => {
      mountedRef.current = false;
      clearPlayerTimers();
      stopCurrentPlayer();

      if (activePlayerOwner === instanceIdRef.current) {
        activePlayerOwner = null;
        activePlayerStop = null;
      }
    };
  }, [claimActivePlayer, clearPlayerTimers, stopCurrentPlayer]);

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

      setIsFullscreen(true);

      if (el && !document.fullscreenElement) {
        el.requestFullscreen?.().catch?.((err) => {
          console.warn("No se pudo activar fullscreen del reproductor:", err);
        });
      }

      onFullscreenHandled?.();
    }
  }, [fullscreenRequested, onFullscreenHandled]);

  useEffect(() => {
    autoplayInitiatedRef.current = false;
    endedLockRef.current = false;
    switchingRef.current = false;
    setProgress(0);
    setDuration(0);
    setShowNextMessage(false);

    if (esColaDefault) {
      setLocalIndexDefault(0);
    }
  }, [esColaDefault]);

  useEffect(() => {
    if (!esColaDefault) return;

    setDefaultOrder(createSequentialOrder(playlist.length));
    setLocalIndexDefault(0);
  }, [esColaDefault, playlist.length, playlistSignature]);

  useEffect(() => {
    if (!playlist.length) {
      stopCurrentPlayer();
      setVideoCalificacion(null);
      setColaCalificaciones([]);
      setProgress(0);
      setDuration(0);
      setShowNextMessage(false);
      autoplayInitiatedRef.current = false;
    }
  }, [playlist.length, stopCurrentPlayer]);

  useEffect(() => {
    if (playlist.length > 0 && !autoplayInitiatedRef.current) {
      autoplayInitiatedRef.current = true;
      claimActivePlayer();
      setIsPlaying(true);
    }
  }, [claimActivePlayer, playlist.length]);

  useEffect(() => {
    const previousPlayer = playerRef.current;

    claimActivePlayer();
    setProgress(0);
    setDuration(0);
    setShowNextMessage(false);

    setIsPlaying(Boolean(activeUrl));

    return () => {
      stopReactPlayer(previousPlayer);
    };
  }, [activeUrl, claimActivePlayer]);

  useEffect(() => {
    if (requestedIndex == null) return;
    if (requestedIndex === effectiveIndex) {
      onRequestedIndexHandled?.();
      return;
    }
    if (requestedIndex < 0 || requestedIndex >= playlist.length) {
      onRequestedIndexHandled?.();
      return;
    }

    safeSwitch(() => {
      setVideoCalificacion(null);
      setColaCalificaciones([]);
      setEffectiveIndex(requestedIndex);
      onRequestedIndexHandled?.();
    });
  }, [
    effectiveIndex,
    onRequestedIndexHandled,
    playlist.length,
    requestedIndex,
    safeSwitch,
    setEffectiveIndex,
  ]);

  const nextVideo = () => {
    if (switchingRef.current) return;

    if (effectiveIndex < playlist.length - 1) {
      safeSwitch(() => {
        setVideoCalificacion(null);
        setColaCalificaciones([]);
        setEffectiveIndex(effectiveIndex + 1);
      });
    } else if (esColaDefault && playlist.length > 0) {
      safeSwitch(() => {
        setVideoCalificacion(null);
        setColaCalificaciones([]);
        restartDefaultCycle();
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
      const next = esColaDefault
        ? playlist[defaultOrder[effectiveIndex + 1]]
        : playlist[effectiveIndex + 1];

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

    if (endedUnlockTimeoutRef.current) {
      clearTimeout(endedUnlockTimeoutRef.current);
    }

    endedUnlockTimeoutRef.current = setTimeout(() => {
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
          restartDefaultCycle();
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
        restartDefaultCycle();
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

      if (fsElement) {
        setIsFullscreen(true);
        resetHideControlsTimer();
      } else {
        setIsFullscreen(false);
        setShowControls(true);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [resetHideControlsTimer]);

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;

    if (isFullscreen && !document.fullscreenElement) {
      setIsFullscreen(false);
    } else if (!document.fullscreenElement) {
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
        margin: isFullscreen ? 0 : "auto",
        position: isFullscreen ? "fixed" : "relative",
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 20000 : undefined,
        background: "#000",
        width: isFullscreen ? "100vw" : "100%",
        aspectRatio: "16 / 9",
        height: isFullscreen ? "100vh" : undefined,
        overflow: "hidden",
      }}
    >
      <div className={`player-wrapper ${isFullscreen ? "player-wrapper-full" : ""}`}>
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
          onPlay={claimActivePlayer}
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
            !esColaDefault && effectiveIndex === playlist.length - 1
              ? undefined
              : nextVideo
          }
          style={{
            ...navButtonStyle(
              "right",
              !esColaDefault && effectiveIndex === playlist.length - 1,
            ),
            cursor:
              !esColaDefault && effectiveIndex === playlist.length - 1
                ? "not-allowed"
                : "pointer",
            opacity:
              !esColaDefault && effectiveIndex === playlist.length - 1
                ? 0.5
                : 1,
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
