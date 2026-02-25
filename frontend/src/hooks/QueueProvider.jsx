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

  //  socket.emit("join", userId);

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
/*   const addToQueue = (cancion) => {
    setCola((prev) => [...prev, cancion]);
  }; */

  const addToQueue = (cancion) => {
  if (!socket || !userId) return;

  socket.emit("agregarCancion", {
    userId,
    cancion,
  });
};



  // Reproducir ahora (CORREGIDA)

  const playNowQueue = (cancion) => {
  if (!socket || !userId) return;

  socket.emit("playNow", {
    userId,
    cancion,
    indexActual: currentIndex,
  });
};


  const actualizarColaServidor = (nuevaCola, index = 0) => {
    if (socket && userId) {
      socket.emit("actualizarCola", {
        userId,
        nuevaCola,
        indexActual: index,
      });
    }
  };

  const setNuevaCola = (nuevaCola, index = 0) => {
    /* setCola(nuevaCola);
    setCurrentIndex(index); */
    actualizarColaServidor(nuevaCola, index);
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
        actualizarColaServidor,
        setNuevaCola, 
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueueContext = () => useContext(QueueContext);
