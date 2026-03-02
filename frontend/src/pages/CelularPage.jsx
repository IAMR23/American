import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useSocketContext } from "../hooks/SocketContext";
export default function CelularPage() {
  const [roomId, setRoomId] = useState(null);
  const { connectSocket } = useSocketContext();

  useEffect(() => {
    const crearSala = async () => {
      let roomId = localStorage.getItem("roomId");

      if (!roomId) {
        const res = await fetch("http://localhost:5000/room/create-room", {
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
      <QRCodeCanvas value={`http://192.168.1.34:5173/sala/${roomId}`} />
    </div>
  );
}