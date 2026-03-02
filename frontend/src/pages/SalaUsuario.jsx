import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocketContext } from "../hooks/SocketContext";
import { QueueProvider } from "../hooks/QueueProvider";
import BuscadorTablaCelular from "../components/BuscadorTablaCelular";

export default function SalaUsuario() {
  const { roomId } = useParams();
  const { connectSocket, isConnected, currentUser } = useSocketContext();
  const [usuario, setUsuario] = useState("");

  useEffect(() => {
    if (!roomId) return;

    // Puedes pedir el nombre real del usuario si hay login
    const nombreUsuario = `USER-${Math.floor(Math.random() * 1000)}`;
    setUsuario(nombreUsuario);

    connectSocket({ roomId, user: nombreUsuario });
  }, [roomId]);

  if (!isConnected) return <p>Conectando a la sala...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Sala {roomId}</h1>
      <h3>Usuario: {usuario}</h3>

      {/* QueueProvider envuelve BuscadorTabla para manejar la cola compartida */}
      <QueueProvider>
        <BuscadorTablaCelular roomId={roomId} />
      </QueueProvider>
    </div>
  );
}