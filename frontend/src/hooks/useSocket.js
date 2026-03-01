import { useEffect } from "react";
import { useSocketContext } from "./SocketContext";

export default function useSocket(userId, onCancionCambiada) {
  const {
    socket,
    isConnected,
    connectSocket,
    disconnectSocket,
    emitEvent,
    onEvent, // ✅ Asegúrate de incluir esto
  } = useSocketContext();

  useEffect(() => {
    if (userId) connectSocket(userId);
    return () => disconnectSocket();
  }, [userId]);

  useEffect(() => {
  if (!socket || !userId) return;

  if (socket.connected) {
    socket.emit("join", userId);
  }

  socket.on("connect", () => {
    socket.emit("join", userId);
  });

  return () => {
    socket.off("connect");
  };
}, [socket, userId]);


  // Escuchar eventos del servidor
  useEffect(() => {
    if (!socket) return;

    const handleCancionCambiada = ({ index, userId: remoteUserId }) => {
      if (remoteUserId === userId && onCancionCambiada) {
        onCancionCambiada(index);
      }
    };

    socket.on("cambiarCancion", handleCancionCambiada);

    return () => {
      socket.off("cambiarCancion", handleCancionCambiada);
    };
  }, [socket, userId, onCancionCambiada]);

  // Wrappers para emitir eventos
  const emitirCola = (nuevaCola, indexActual = 0) => {
    emitEvent("actualizarCola", { userId, nuevaCola, indexActual });
  };

  const emitirCambiarCancion = (index) => {
    emitEvent("cambiarCancion", { userId, index });
  };

  const agregarCancion = (cancion) => {
  emitEvent("agregarCancion", { userId, cancion });
};

const playNow = (cancion, indexActual) => {
  emitEvent("playNow", { userId, cancion, indexActual });
};


  return {
    socket,
    isConnected,
    emitirCola,
    emitirCambiarCancion,
    onEvent, 
    agregarCancion, 
    playNow, 
  };
}
