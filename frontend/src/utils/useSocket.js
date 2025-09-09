import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../config";

export default function useSocket(userId, onColaActualizada, onCambiarCancion) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const newSocket = io(API_URL);
    setSocket(newSocket);

    console.log("Socket conectado para usuario:", userId);

    newSocket.emit("join", userId);

    newSocket.on("colaActualizada", (colaActualizada) => {
      console.log("Socket: Cola actualizada recibida", colaActualizada);
      onColaActualizada?.(colaActualizada);
    });

    newSocket.on("cambiarCancionCliente", (index) => {
      console.log("Socket: Cambiar canción a índice", index);
      onCambiarCancion?.(index);
    });

    return () => {
      console.log("Socket desconectado");
      newSocket.disconnect();
    };
  }, [userId]);

  const emitirCola = (cola) => {
    if (socket) {
      console.log("Socket: Emitiendo cola actualizada", cola);
      socket.emit("colaActualizada", cola);
    }
  };

  const emitirCambiarCancion = (index) => {
    if (socket) {
      console.log("Socket: Emitiendo cambiar canción", index);
      socket.emit("cambiarCancion", { userId, index });
    }
  };

  return { socket, emitirCola, emitirCambiarCancion };
}
