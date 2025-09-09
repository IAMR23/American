import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../config";

export default function useSocket(userId, onColaActualizada, onCambiarCancion) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const newSocket = io("https://american-karaoke.com", {
      path: "/socket.io/",
      transports: ["websocket"],
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket conectado:", newSocket.id);
      newSocket.emit("join", userId); // unirse a la sala cuando la conexión está lista
    });

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
