const phoneNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '593998359931';

export default function WhatsAppButton() {
  const message = encodeURIComponent('Hola, necesito información sobre Book Store 📚');
  const link = `https://wa.me/${phoneNumber}?text=${message}`;

  return <a
    className="whatsapp-button"
    href={link}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Contactar a Book Store por WhatsApp"
    title="Contáctanos por WhatsApp"
  >
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png"
      alt=""
      width="60"
      height="60"
      aria-hidden="true"
    />
  </a>;
}
