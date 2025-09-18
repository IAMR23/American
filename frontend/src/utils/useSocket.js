import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function useSocket(userId, onColaActualizada, onCambiarCancion) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userId) return;

    // 🔹 Conexión al servidor
    const newSocket = io("https://american-karaoke.com", {
      path: "/socket.io/",
      transports: ["websocket"],   // fuerza WebSocket
      withCredentials: true,       // importante si manejas cookies/autenticación
    });

    setSocket(newSocket);

    // 🔹 Eventos de conexión
    newSocket.on("connect", () => {
      console.log("Socket conectado:", newSocket.id);
      newSocket.emit("join", userId);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Error al conectar el socket:", err.message);
    });

    // 🔹 Cola actualizada desde el servidor
    newSocket.on("colaActualizada", (colaActualizada) => {
      console.log("Socket: Cola actualizada recibida", colaActualizada);
      onColaActualizada?.(colaActualizada);
    });

    // 🔹 Cambiar canción desde el servidor
    newSocket.on("cambiarCancionCliente", (index) => {
      console.log("Socket: Cambiar canción a índice", index);
      onCambiarCancion?.(index);
    });

    // 🔹 Cleanup
    return () => {
      console.log("Socket desconectado");
      newSocket.disconnect();
    };
  }, [userId]);

  // 🔹 Funciones para emitir eventos al servidor
  const emitirCola = (nuevaCola, indexActual) => {
    if (socket) {
      console.log("Emitir cola actualizada:", nuevaCola);
      socket.emit("actualizarCola", { userId, nuevaCola, indexActual });
    }
  };

  const emitirCambiarCancion = (index) => {
    if (socket) {
      console.log("Emitir cambiar canción:", index);
      socket.emit("cambiarCancion", { userId, index });
    }
  };

  return { socket, emitirCola, emitirCambiarCancion };
}
