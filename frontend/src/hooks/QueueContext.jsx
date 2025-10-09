// QueueContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocketContext } from "./SocketContext";

const QueueContext = createContext();

export const useQueueContext = () => {
  const context = useContext(QueueContext);
  if (!context) throw new Error("useQueueContext debe usarse dentro de QueueProvider");
  return context;
};

export const QueueProvider = ({ userId, children }) => {
  const { emitEvent, onEvent, connectSocket, disconnectSocket, isConnected } = useSocketContext();
  const [cola, setCola] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🔌 Conectar socket al montar
  useEffect(() => {
    if (!userId) return;
    connectSocket(userId);
    return () => disconnectSocket();
  }, [userId]);

  // 📥 Escuchar actualizaciones desde el servidor
  useEffect(() => {
    if (!onEvent) return;

    const unsubCola = onEvent("actualizarColaCliente", ({ nuevaCola, indexActual }) => {
      console.log("🎵 Cola sincronizada desde servidor:", nuevaCola);
      if (Array.isArray(nuevaCola)) setCola(nuevaCola);
      if (typeof indexActual === "number") setCurrentIndex(indexActual);
    });

    const unsubCambio = onEvent("cambiarCancionCliente", (index) => {
      console.log("➡️ Canción cambiada por otro cliente:", index);
      setCurrentIndex(index);
    });

    return () => {
      unsubCola();
      unsubCambio();
    };
  }, [onEvent]);

  // 💾 Persistencia local
  useEffect(() => {
    localStorage.setItem("colaKaraoke", JSON.stringify({ cola, currentIndex }));
  }, [cola, currentIndex]);

  useEffect(() => {
    const saved = localStorage.getItem("colaKaraoke");
    if (saved) {
      const { cola: savedCola, currentIndex: savedIndex } = JSON.parse(saved);
      if (Array.isArray(savedCola)) setCola(savedCola);
      if (typeof savedIndex === "number") setCurrentIndex(savedIndex);
    }
  }, []);

  // ➕ Agregar canción a la cola
  const agregarACola = (cancion) => {
    setCola((prev) => {
      const exists = prev.some((c) => c._id === cancion._id);
      if (exists) return prev;

      const nuevaCola = [...prev, cancion];
      emitEvent("actualizarCola", { userId, nuevaCola, indexActual: currentIndex });
      return nuevaCola;
    });
  };

  // ⏭️ Cambiar canción
  const cambiarCancion = (nuevoIndice) => {
    setCurrentIndex(nuevoIndice);
    emitEvent("cambiarCancion", { userId, index: nuevoIndice });
  };

  // 🔄 Reemplazar toda la cola
  const reemplazarCola = (nuevaCola) => {
    setCola(nuevaCola);
    setCurrentIndex(0);
    emitEvent("actualizarCola", { userId, nuevaCola, indexActual: 0 });
  };

  return (
    <QueueContext.Provider
      value={{
        cola,
        currentIndex,
        agregarACola,
        cambiarCancion,
        reemplazarCola,
        isConnected,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};
