import { createContext, useContext, useState, useEffect } from "react";
import useSocket from "../hooks/useSocket";

const QueueContext = createContext();

export const QueueProvider = ({ children, userId }) => {
  const [cola, setCola] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [colaCargada, setColaCargada] = useState(false);

  const { socket, emitirCola, emitirCambiarCancion } = useSocket(
    userId,
    (index) => setCurrentIndex(index)
  );

  const changeSong = (index) => {
    if (index >= 0 && index < cola.length) {
      setCurrentIndex(index);
    }
  };

  useEffect(() => {
    if (!socket || !userId) return;

    socket.emit("join", userId);

    const handleColaActualizada = ({ nuevaCola, indexActual }) => {
      if (!nuevaCola) return;
      setCola(nuevaCola.filter((c) => c && c._id));

      setCurrentIndex((prevIndex) => {
        if (!colaCargada) {
          setColaCargada(true);
          return indexActual ?? 0;
        }
        return prevIndex;
      });
    };

    socket.on("colaActualizada", handleColaActualizada);
    return () => socket.off("colaActualizada", handleColaActualizada);
  }, [socket, userId, colaCargada]);

  // Agregar al final (existing)
  const addToQueue = (cancion) => {
    setCola((prev) => [...prev, cancion]);
  };

  // Reproducir ahora (CORREGIDA)
  const playNowQueue = (cancion) => {
    setCola((prevCola) => {
      // Quitar duplicados primero
      const sinDuplicado = prevCola.filter((c) => c._id !== cancion._id);

      // Insertar justo en la posición actual
      const nuevaCola = [
        ...sinDuplicado.slice(0, currentIndex),
        cancion,
        ...sinDuplicado.slice(currentIndex),
      ];

      // Emitir la cola actualizada al backend o a otros clientes
      setTimeout(() => {
        emitirCola(nuevaCola, currentIndex);
      }, 0);

      return nuevaCola;
    });

    setCurrentIndex(currentIndex);
  };

  return (
    <QueueContext.Provider
      value={{
        cola,
        currentIndex,
        setCola,
        setCurrentIndex,
        playNowQueue,
        addToQueue,
        emitirCola,
        emitirCambiarCancion,
        changeSong,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueueContext = () => useContext(QueueContext);
