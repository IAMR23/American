import { createContext, useContext, useState, useEffect } from "react";
import useSocket from "../hooks/useSocket";

const QueueContext = createContext();

export const QueueProvider = ({ children, userId }) => {
  const [cola, setCola] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const {
    socket,
    emitirCola,
    emitirCambiarCancion,
    agregarCancion,
    playNow,
    onEvent,
    
  } = useSocket(userId);

  // 🔥 Fuente única de verdad
  useEffect(() => {
    if (!socket || !userId) return;

    const handleColaActualizada = ({ nuevaCola, indexActual }) => {
      if (!nuevaCola) return;

      setCola(nuevaCola.filter((c) => c && c._id));
      setCurrentIndex(indexActual ?? 0);
    };

    const off = onEvent("colaActualizada", handleColaActualizada);

    return off;
  }, [socket, userId]);

  // 🎯 Acciones de negocio

  const changeSong = (index) => {
    if (index >= 0 && index < cola.length) {
      emitirCambiarCancion(index);
    }
  };

  const addToQueue = (cancion) => {
    agregarCancion(cancion);
  };

  const playNowQueue = (cancion) => {
    playNow(cancion, currentIndex);
  };

  const setNuevaCola = (nuevaCola, index = 0) => {
    emitirCola(nuevaCola, index);
  };

  
  return (
    <QueueContext.Provider
      value={{
        cola,
        currentIndex,
        playNowQueue,
        addToQueue,
        changeSong,
        setCola,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueueContext = () => useContext(QueueContext);