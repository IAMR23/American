import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../config";

const SocketContext = createContext();

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext debe ser usado dentro de SocketProvider");
  }
  return context;
}

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const eventBuffer = useRef([]);

  const connectSocket = ({ roomId, user }) => {
    if (!roomId) return console.warn("❌ No roomId provided");

    if (socketRef.current && currentRoomId === roomId && socketRef.current.connected) {
      console.log("✅ Socket ya conectado a sala:", roomId);
      return;
    }

    if (socketRef.current) socketRef.current.disconnect();

   // const newSocket = io(API_URL, {
    const newSocket = io("https://american-karaoke.com", {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setCurrentRoomId(roomId);
    setCurrentUser(user);

    newSocket.on("connect", () => {
      console.log(`✅ Usuario ${user} conectado a sala ${roomId} (socket id: ${newSocket.id})`);
      setIsConnected(true);

      newSocket.emit("joinRoom", { roomId, user });

      eventBuffer.current.forEach(({ event, data }) => newSocket.emit(event, data));
      eventBuffer.current = [];
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket desconectado:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Error al conectar socket:", err.message);
      setIsConnected(false);
    });

    newSocket.on("reconnect", (attempt) => {
      console.log("🔄 Socket reconectado tras", attempt, "intentos");
      setIsConnected(true);
      newSocket.emit("joinRoom", { roomId, user });
      eventBuffer.current.forEach(({ event, data }) => newSocket.emit(event, data));
      eventBuffer.current = [];
    });

    newSocket.on("error", (err) => console.error("❌ Socket error:", err));
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setCurrentRoomId(null);
    setCurrentUser(null);
    eventBuffer.current = [];
  };

  const emitEvent = (event, data = {}) => {
    const payload = { ...data, roomId: currentRoomId };
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, payload);
      return true;
    } else {
      eventBuffer.current.push({ event, data: payload });
      return false;
    }
  };

  const onEvent = (event, callback) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on(event, callback);
    return () => socketRef.current?.off(event, callback);
  };

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        currentRoomId,
        currentUser,
        connectSocket,
        disconnectSocket,
        emitEvent,
        onEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}