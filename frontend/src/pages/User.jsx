import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";
import { jwtDecode } from "jwt-decode";

export default function UserSubscription() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const decoded = jwtDecode(token);
        const userId = decoded.userId;

        const res = await axios.get(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(res.data.user);
      } catch (err) {
        console.error("Error cargando usuario:", err.message);
      }
    };

    fetchUser();
  }, []);

  if (!user) return <div className="container mt-4">Cargando usuario...</div>;

  // Función para formatear fechas
  const formatDate = (date) => {
    if (!date) return "No disponible";
    return new Date(date).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Verificar si la suscripción está activa
  const isActive = user.suscrito && new Date(user.subscriptionEnd) > new Date();

  return (
    <div className="d-flex justify-content-center align-items-center">
      <div
        className="card shadow-lg"
        style={{ maxWidth: "600px", width: "100%" }}
      >
        <div className="card-body bg-primary rounded text-light">
          {/* LOGO */}
          <div className="text-center mb-4">
            <img
              src="/logo.png"
              alt="American Karaoke"
              style={{ width: "180px" }}
            />
          </div>

          {/* BIENVENIDA */}
          <h3 className="text-center mb-3 fw-bold">Bienvenido {user.nombre}</h3>

          {/* Título */}
          <h4 className="text-center mb-4 fw-bold">
            Información de Suscripción
          </h4>

          {/* Estado */}
          <div className="text-center mb-4">
            <span
              className="badge px-4 py-2 fs-5"
              style={{
                backgroundColor: isActive ? "#dc3545" : "#6c757d",
              }}
            >
              {isActive ? "Activa" : "Inactiva"}
            </span>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Nombre</label>
              <div className="form-control bg-light text-dark">
                {user.nombre}
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Correo</label>
              <div className="form-control bg-light text-dark">
                {user.email}
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Rol</label>
              <div className="form-control bg-light text-dark">{user.rol}</div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label fw-semibold">Fecha de inicio</label>
              <div className="form-control bg-light text-dark">
                {formatDate(user.subscriptionStart)}
              </div>
            </div>

            <div className="col-md-6 mb-4">
              <label className="form-label fw-semibold">Fecha de fin</label>
              <div className="form-control bg-light text-dark">
                {formatDate(user.subscriptionEnd)}
              </div>
            </div>
          </div>

          {/* Barra progreso ocupa todo el ancho */}
          {user.subscriptionStart && user.subscriptionEnd && (
            <div className="mt-3">
              <div className="progress" style={{ height: "10px" }}>
                <div
                  className="progress-bar bg-danger"
                  role="progressbar"
                  style={{
                    width: `${Math.min(
                      100,
                      ((new Date() - new Date(user.subscriptionStart)) /
                        (new Date(user.subscriptionEnd) -
                          new Date(user.subscriptionStart))) *
                        100,
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
