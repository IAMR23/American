import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useSocketContext } from "./SocketContext";

const QueueContext = createContext();

export const QueueProvider = ({ children }) => {
  const [cola, setCola] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modoMesaActivo, setModoMesaActivo] = useState(false);
  const [modoMesaItems, setModoMesaItems] = useState([]);
  const { socket, emitEvent, onEvent, currentRoomId } = useSocketContext();
  const playNowTimeoutRef = useRef(null);

  useEffect(() => {
    if (!socket || !currentRoomId) return;

    const handleColaActualizada = ({
      nuevaCola,
      indexActual,
      modoMesaActivo: nextModoMesaActivo,
      modoMesaItems: nextModoMesaItems,
    }) => {
      if (!nuevaCola) return;

      const colaValida = nuevaCola.filter((c) => c && c._id);
      const requestedIndex = Number(indexActual);
      const safeIndex =
        colaValida.length > 0 && Number.isFinite(requestedIndex)
          ? Math.min(Math.max(requestedIndex, 0), colaValida.length - 1)
          : 0;

      setCola(colaValida);
      setCurrentIndex(safeIndex);

      if (typeof nextModoMesaActivo === "boolean") {
        setModoMesaActivo(nextModoMesaActivo);
      }

      if (Array.isArray(nextModoMesaItems)) {
        setModoMesaItems(nextModoMesaItems);
      }
    };

    const off = onEvent("colaActualizada", handleColaActualizada);
    return off;
  }, [socket, currentRoomId]);

  const addToQueue = (cancion) =>
    cancion?._id && emitEvent("addSong", { song: cancion });
  const changeSong = (index) => {
    // ✅ MEJORADO: Permitir que el servidor valide en lugar de fallar silenciosamente
    if (index < 0) return;
    console.log(
      `🎵 Emitiendo cambiarCancion: index=${index}, colaLength=${cola.length}`
    );
    emitEvent("cambiarCancion", { index });
  };
  const playNowQueue = (cancion) => {
    if (!cancion?._id) return;

    if (playNowTimeoutRef.current) {
      clearTimeout(playNowTimeoutRef.current);
    }

    emitEvent("addSong", { song: cancion });
    playNowTimeoutRef.current = setTimeout(() => {
      emitEvent("cambiarCancion", { index: cola.length });
      playNowTimeoutRef.current = null;
    }, 300);
  };
  const removeFromQueue = (songId) =>
    songId && emitEvent("removeSong", { songId });
  const clearQueue = () => emitEvent("clearQueue");

  const setNuevaCola = (canciones, index = 0) => {
    if (!Array.isArray(canciones)) return;
    emitEvent("setQueue", {
      roomId: currentRoomId,
      nuevaCola: canciones,
      indexActual: index,
    });
  };

  useEffect(() => {
    return () => {
      if (playNowTimeoutRef.current) {
        clearTimeout(playNowTimeoutRef.current);
      }
    };
  }, []);

  return (
    <QueueContext.Provider
      value={{
        cola,
        currentIndex,
        modoMesaActivo,
        modoMesaItems,
        addToQueue,
        changeSong,
        playNowQueue,
        removeFromQueue,
        clearQueue,
        setCola,
        setNuevaCola,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueueContext = () => useContext(QueueContext);
