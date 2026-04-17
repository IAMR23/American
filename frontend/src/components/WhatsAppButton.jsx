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
      <div
        className="bg-dark bg-opacity-75 text-warning rounded-4 shadow-lg px-3 px-md-4 py-2 py-md-3 me-3 text-center"
        style={{
          maxWidth: "600px",
          backdropFilter: "blur(2px)",
        }}
      >
        <div
          className="fw-bold fst-italic"
          style={{
            lineHeight: "1.3",
            textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
            fontSize: "clamp(0.95rem, 1.8vw, 1.4rem)",
          }}
        >
          Para pagar con transferencia al botón de Whatsapp
        </div>

        <div
          className="fw-bold fst-italic mt-1"
          style={{
            textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
            fontSize: "clamp(1rem, 2vw, 1.8rem)",
          }}
        >
          Opción válida solo en Ecuador
        </div>

        {/* Flecha */}
        <div
          className="text-success fw-bold mt-1"
          style={{
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            lineHeight: 1,
            transform: "translateX(12px)",
          }}
        >
          ➜
        </div>
      </div>

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