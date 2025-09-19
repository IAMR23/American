import { useEffect } from "react";
import { useSocketContext } from "./SocketContext";

export default function useSocket(userId) {
  const { socket, isConnected, connectSocket, disconnectSocket, emitEvent, onEvent } = useSocketContext();

  useEffect(() => {
    if (userId) connectSocket(userId);
    return () => disconnectSocket();
  }, [userId]);

  return { socket, isConnected, emitEvent, onEvent };
}
