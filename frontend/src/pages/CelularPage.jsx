import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useSocketContext } from "../hooks/SocketContext";
import { API_URL } from "../config";

export default function CelularPage() {
  const [roomId, setRoomId] = useState(null);
  const { connectSocket } = useSocketContext();

  useEffect(() => {
    const crearSala = async () => {
      let roomId = localStorage.getItem("roomId");

      if (!roomId) {
        const res = await fetch(`${API_URL}/room/create-room`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: "HOST" }),
        });
        const data = await res.json();
        roomId = data.roomId;
        localStorage.setItem("roomId", roomId);
      }

      setRoomId(roomId);
      connectSocket({ roomId, user: "HOST" });
    };

    crearSala();
  }, []);

  if (!roomId) return <p>Cargando sala...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Sala creada</h1>
      <h2>ID: {roomId}</h2>
      <QRCodeCanvas value={`https://american-karaoke.com/sala/${roomId}`} />
    </div>
  );
}