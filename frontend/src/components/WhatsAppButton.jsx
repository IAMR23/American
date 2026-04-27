import "../styles/Whatsapp.css";

export default function WhatsAppButton() {
  const phoneNumber = "593992858003";
  const mensaje = encodeURIComponent(
    "Hola, quiero activar mi cuenta de American Karaoke 🎤"
  );

  const link = `https://wa.me/${phoneNumber}?text=${mensaje}`;

  return (
    <div
      className="position-fixed d-flex align-items-center"
      style={{
        bottom: "50px",
        right: "50px",
        zIndex: 9999,
      }}
    >
      {/* Panel flotante */}
     

      {/* Botón WhatsApp */}
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
          width={60}
          height={60}
        />
      </a>
    </div>
  );
}