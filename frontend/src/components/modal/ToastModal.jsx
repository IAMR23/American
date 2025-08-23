// ToastModal.jsx
import React, { useEffect } from "react";
import "./toastModal.css";

export default function ToastModal({ mensaje, duracion = 2000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duracion);

    return () => clearTimeout(timer);
  }, [duracion, onClose]);

  if (!mensaje) return null;

  return (
    <div className="toast-modal">
      {mensaje}
    </div>
  );
}
