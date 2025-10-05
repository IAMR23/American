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

  return {
    socket,
    isConnected,
    emitirCola,
    emitirCambiarCancion,
    onEvent, // ✅ <-- agrégalo aquí
  };
}
