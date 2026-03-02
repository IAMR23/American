import { createContext, useContext, useState, useEffect } from "react";
import { useSocketContext } from "./SocketContext";

const QueueContext = createContext();

export const QueueProvider = ({ children }) => {
  const [cola, setCola] = useState([]);
  const [nuevaCola, setNuevaCola] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { socket, emitEvent, onEvent, currentRoomId } = useSocketContext();

  useEffect(() => {
    if (!socket || !currentRoomId) return;

    const handleColaActualizada = ({ nuevaCola, indexActual }) => {
      if (!nuevaCola) return;
      setCola(nuevaCola.filter((c) => c && c._id));
      setCurrentIndex(indexActual ?? 0);
    };

    const off = onEvent("colaActualizada", handleColaActualizada);
    return off;
  }, [socket, currentRoomId]);

  const addToQueue = (cancion) => cancion?._id && emitEvent("addSong", { song: cancion });
  const changeSong = (index) => index >= 0 && index < cola.length && emitEvent("cambiarCancion", { index });
  const playNowQueue = (cancion) => {
    if (!cancion?._id) return;
    emitEvent("addSong", { song: cancion });
    setTimeout(() => emitEvent("cambiarCancion", { index: cola.length }), 300);
  };
  const removeFromQueue = (songId) => songId && emitEvent("removeSong", { songId });
  const clearQueue = () => emitEvent("clearQueue");

  return (
    <QueueContext.Provider value={{ cola, currentIndex, addToQueue, changeSong, playNowQueue, removeFromQueue, clearQueue, setCola }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueueContext = () => useContext(QueueContext);