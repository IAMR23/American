import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";
import { useSocketContext } from "../hooks/SocketContext";
import { API_URL } from "../config";
import { getToken, getUserId } from "../utils/auth";

export default function CelularPage() {
  const [roomId, setRoomId] = useState(null);
  const { connectSocket } = useSocketContext();

  useEffect(() => {
    const crearSala = async () => {
      let savedRoomId = localStorage.getItem("roomId");
      const ownerId = getUserId();
      const savedRoomOwnerId = localStorage.getItem("roomOwnerId");

      if (!ownerId) return;

      if (savedRoomId && savedRoomOwnerId !== String(ownerId)) {
        localStorage.removeItem("roomId");
        localStorage.removeItem("roomOwnerId");
        savedRoomId = null;
      }

      if (!savedRoomId) {
        const token = getToken();
        const res = await axios.post(`${API_URL}/room/create-room`, {
          user: "HOST",
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = res.data;
        savedRoomId = data.roomId;
        localStorage.setItem("roomId", savedRoomId);
        localStorage.setItem("roomOwnerId", String(ownerId));
      }

      setRoomId(savedRoomId);
      connectSocket({ roomId: savedRoomId, user: "HOST" });
    };

    crearSala();
  }, [connectSocket]);

  if (!roomId) return <p>Cargando sala...</p>;

  const baseUrl = window.location.origin;

  return (
    <div className="celular-page d-flex justify-content-center align-items-center px-3 py-3">
      <div
        className="card border-0 shadow-lg text-center w-100"
        style={{ maxWidth: "1080px", borderRadius: "18px" }}
      >
        <div className="card-body p-3 p-md-4">
          <h1 className="fw-bold mb-3 fs-2 fs-md-1">Sala creada</h1>

          <p className="text-muted mb-1">Codigo de sala</p>

          <h2 className="fw-bold text-danger mb-4">{roomId}</h2>

          <div className="row g-3 justify-content-center mb-4">
            <div className="col-12 col-md-4">
              <div className="border rounded-3 p-3 h-100">
                <h3 className="h5 fw-bold mb-2">Cola normal</h3>
                <div className="d-flex justify-content-center align-items-center">
                  <div className="bg-primary p-3 rounded-4 shadow-sm">
                    <QRCodeCanvas
                      value={`${baseUrl}/sala/${roomId}`}
                      size={220}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>
                <p className="text-muted small mb-0 mt-2">
                  Agregar canciones directo a la cola.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="border rounded-3 p-3 h-100">
                <h3 className="h5 fw-bold mb-2">Modo Mesa QR</h3>
                <div className="d-flex justify-content-center align-items-center">
                  <div className="bg-success p-3 rounded-4 shadow-sm">
                    <QRCodeCanvas
                      value={`${baseUrl}/mesa/${roomId}`}
                      size={220}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>
                <p className="text-muted small mb-0 mt-2">
                  Seleccionar mesa, nombre y canciones.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="border rounded-3 p-3 h-100">
                <h3 className="h5 fw-bold mb-2">PDF por Cancion</h3>
                <div className="d-flex justify-content-center align-items-center">
                  <div className="bg-danger p-3 rounded-4 shadow-sm">
                    <QRCodeCanvas
                      value={`${baseUrl}/listado-pdf/cancion`}
                      size={220}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>
                <p className="text-muted small mb-0 mt-2">
                  Descargar listado ordenado por cancion.
                </p>
              </div>
            </div>
          </div>

          <p className="text-muted small mb-0">
            Escanea el codigo QR segun el flujo que quieras usar.
          </p>
        </div>
      </div>
    </div>
  );
}
