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

    <div className="container-fluid min-vh-100 d-flex justify-content-center align-items-center px-3 py-4">
  <div
    className="card border-0 shadow-lg text-center w-100"
    style={{ maxWidth: "500px", borderRadius: "18px" }}
  >
    <div className="card-body p-4 p-md-5">
      <h1 className="fw-bold mb-3 fs-2 fs-md-1">
        Sala creada
      </h1>

      <p className="text-muted mb-1">
        Código de sala
      </p>

      <h2 className="fw-bold text-danger mb-4">
        {roomId}
      </h2>

      <div className="d-flex justify-content-center align-items-center mb-4">
        <div className="bg-primary p-3 rounded-4 shadow-sm">
          <QRCodeCanvas
            value={`https://www.american-karaoke.com/sala/${roomId}`}
            size={280}
            level="H"
            includeMargin={true}
          />
        </div>
      </div>

      <p className="text-muted small mb-0">
        Escanea el código QR para entrar a la sala
      </p>
    </div>
  </div>
</div>
  );
}