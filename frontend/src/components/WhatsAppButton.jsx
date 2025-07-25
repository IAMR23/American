import React, { useEffect, useState } from "react";
import "../styles/Whatsapp.css";
import axios from "axios";

export default function WhatsAppButton() {
  const [mostrarBoton, setMostrarBoton] = useState(false);

  useEffect(() => {
    const verificarSuscripcion = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get("http://localhost:5000/user/suscripcion", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const usuario = res.data;
        const suscrito = usuario.suscrito;
        const finSuscripcion = new Date(usuario.subscriptionEnd);
        const ahora = new Date();

        // Mostrar el botón solo si no está suscrito o si la suscripción ya expiró
        if (!suscrito || ahora > finSuscripcion) {
          setMostrarBoton(true);
        }
      } catch (error) {
        console.error("Error al verificar suscripción:", error);
        // Si hay error (por ejemplo, no logueado), se muestra el botón
        setMostrarBoton(true);
      }
    };

    verificarSuscripcion();
  }, []);

  if (!mostrarBoton) return null;

  const phoneNumber = "593999999999"; // Cambia aquí tu número real
  const mensaje = encodeURIComponent(
    "Hola, quiero activar mi cuenta de American Karaoke 🎤"
  );
  const link = `https://wa.me/${phoneNumber}?text=${mensaje}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-button"
      aria-label="Contactar por WhatsApp"
    >
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png"
        alt="WhatsApp"
        style={{
          width: "60px",
          height: "60px",
        }}
      />
    </a>
  );
}
