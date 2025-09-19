import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../config'; 

const SocketContext = createContext();

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext debe ser usado dentro de SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const eventBuffer = useRef([]); // Para eventos emitidos mientras no hay conexión

  const connectSocket = (userId) => {
    if (!userId) return console.warn("❌ SocketContext: No userId provided");

    // Evitar reconexión innecesaria
    if (socketRef.current && currentUserId === userId && socketRef.current.connected) {
      return console.log("✅ Socket ya conectado para userId:", userId);
    }

    // Desconectar socket anterior
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const newSocket = io(API_URL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setCurrentUserId(userId);

    // Eventos de socket
    newSocket.on('connect', () => {
      console.log('✅ Socket conectado:', newSocket.id);
      setIsConnected(true);
      newSocket.emit('join', userId);
      
      // Emitir eventos pendientes
      eventBuffer.current.forEach(({ event, data }) => newSocket.emit(event, data));
      eventBuffer.current = [];
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket desconectado:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Error al conectar socket:', err.message);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attempt) => {
      console.log('🔄 Socket reconectado tras', attempt, 'intentos');
      setIsConnected(true);
      newSocket.emit('join', userId);
      
      // Emitir eventos pendientes tras reconexión
      eventBuffer.current.forEach(({ event, data }) => newSocket.emit(event, data));
      eventBuffer.current = [];
    });

    newSocket.on('error', (err) => console.error('❌ Socket error:', err));
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setCurrentUserId(null);
      eventBuffer.current = [];
    }
  };

  const emitEvent = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
      return true;
    } else {
      // Guardar evento en buffer para enviar al reconectarse
      eventBuffer.current.push({ event, data });
      return false;
    }
  };

  const onEvent = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return () => socketRef.current.off(event, callback);
    }
    return () => {};
  };

  // Cleanup global
  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      currentUserId,
      connectSocket,
      disconnectSocket,
      emitEvent,
      onEvent
    }}>
      {children}
    </SocketContext.Provider>
  );
};
