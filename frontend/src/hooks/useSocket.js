import { useEffect } from "react";
import { useSocketContext } from "./SocketContext";

export default function useSocket(roomId, onCancionCambiada) {
  const {
    socket,
    isConnected,
    connectSocket,
    disconnectSocket,
    emitEvent,
    onEvent,
  } = useSocketContext();

  // 🔌 Conectar
  useEffect(() => {
    if (roomId) connectSocket();
    return () => disconnectSocket();
  }, [roomId]);

  // 🏠 Join room
  useEffect(() => {
    if (!socket || !roomId) return;

    if (socket.connected) {
      socket.emit("joinRoom", roomId);
    }

    socket.on("connect", () => {
      socket.emit("joinRoom", roomId);
    });

    return () => {
      socket.off("connect");
    };
  }, [socket, roomId]);

  // ▶️ Cambio de canción
  useEffect(() => {
    if (!socket) return;

    const handler = ({ index }) => {
      if (onCancionCambiada) {
        onCancionCambiada(index);
      }
    };

    socket.on("cambiarCancion", handler);

    return () => {
      socket.off("cambiarCancion", handler);
    };
  }, [socket, onCancionCambiada]);

  // 📡 Emit helpers
  const emitirCola = (nuevaCola, indexActual = 0) => {
    emitEvent("actualizarCola", { roomId, nuevaCola, indexActual });
  };

  const emitirCambiarCancion = (index) => {
    emitEvent("cambiarCancion", { roomId, index });
  };

  const agregarCancion = (cancion) => {
    emitEvent("agregarCancion", { roomId, cancion });
  };

  const playNow = (cancion, indexActual) => {
    emitEvent("playNow", { roomId, cancion, indexActual });
  };

  return {
    socket,
    isConnected,
    emitirCola,
    emitirCambiarCancion,
    agregarCancion,
    playNow,
    onEvent,
  };
}