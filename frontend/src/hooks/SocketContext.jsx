import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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
  const eventBuffer = useRef([]);
  const currentRoomIdRef = useRef(null);
  const isConnectedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const setConnected = useCallback((value) => {
    isConnectedRef.current = value;
    setIsConnected(value);
  }, []);

  const cleanupSocket = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.removeAllListeners();
    socketRef.current.disconnect();
    socketRef.current = null;
  }, []);

  const connectSocket = useCallback(
    ({ roomId, user } = {}) => {
      if (!roomId) return console.warn("No roomId provided");

      if (
        socketRef.current &&
        currentRoomIdRef.current === roomId &&
        socketRef.current.connected
      ) {
        return;
      }

      cleanupSocket();

      const newSocket = io(API_URL, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = newSocket;
      currentRoomIdRef.current = roomId;
      setCurrentRoomId(roomId);
      setCurrentUser(user);

      const flushBuffer = () => {
        eventBuffer.current.forEach(({ event, data }) => {
          newSocket.emit(event, data);
        });
        eventBuffer.current = [];
      };

      const joinRoom = () => {
        newSocket.emit("joinRoom", { roomId, user });
        flushBuffer();
      };

      newSocket.on("connect", () => {
        setConnected(true);
        joinRoom();
      });

      newSocket.on("disconnect", () => {
        setConnected(false);
      });

      newSocket.on("connect_error", (err) => {
        console.error("Error al conectar socket:", err.message);
        setConnected(false);
      });

      newSocket.on("reconnect", () => {
        setConnected(true);
        joinRoom();
      });

      newSocket.on("error", (err) => {
        console.error("Socket error:", err);
      });
    },
    [cleanupSocket, setConnected],
  );

  const disconnectSocket = useCallback(() => {
    cleanupSocket();
    setConnected(false);
    setCurrentRoomId(null);
    setCurrentUser(null);
    currentRoomIdRef.current = null;
    eventBuffer.current = [];
  }, [cleanupSocket, setConnected]);

  const emitEvent = useCallback((event, data = {}) => {
    const payload = { ...data, roomId: currentRoomIdRef.current };

    if (socketRef.current && isConnectedRef.current) {
      socketRef.current.emit(event, payload);
      return true;
    }

    eventBuffer.current.push({ event, data: payload });
    return false;
  }, []);

  const onEvent = useCallback((event, callback) => {
    if (!socketRef.current) return () => {};

    socketRef.current.off(event, callback);
    socketRef.current.on(event, callback);

    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  useEffect(() => {
    return () => {
      cleanupSocket();
      currentRoomIdRef.current = null;
      isConnectedRef.current = false;
      eventBuffer.current = [];
    };
  }, [cleanupSocket]);

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
