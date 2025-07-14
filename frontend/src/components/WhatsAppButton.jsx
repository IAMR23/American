import React from "react";
import "../styles/Whatsapp.css";
export default function WhatsAppButton() {
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
