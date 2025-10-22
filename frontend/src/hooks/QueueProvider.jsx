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

  // Reproducir ahora (nueva)
const playNowQueue = (cancion, reproducirAhora = false, indexActual = 0) => {
  setCola((prevCola) => {
    let nuevaCola = [...prevCola];

    // Elimina la canción si ya existe
    nuevaCola = nuevaCola.filter((c) => c._id !== cancion._id);

    if (reproducirAhora) {
      // Evita índices fuera de rango
      const insertIndex = Math.min(Math.max(indexActual + 1, 0), nuevaCola.length);
      nuevaCola.splice(insertIndex, 0, cancion);
    } else {
      nuevaCola.push(cancion);
    }

    console.log("Cola actualizada:", nuevaCola);
    return nuevaCola;
  });
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
