import React from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../utils/auth";
import PromocionesVideo from "./PromocionesVideo";

export default function PublicacionesPage() {
  const navigate = useNavigate();
  return (
    <>
      <div className="vh-100">
        <div className="fondo container-fluid  overflow-hidden px-2 px-md-4 py-3 d-flex flex-column justify-content-center align-items-center">
          <div className="d-flex flex-wrap justify-content-center align-items-center w-100 gap-3">
            <img
              src="./icono.png"
              alt="icono"
              style={{ width: "60px", height: "auto" }}
            />
            <img
              onClick={() => navigate("/")}
              src="./logo.png"
              alt="logo"
              className="img-fluid"
              style={{
                width: "80%", // 80% en móviles
                maxWidth: "600px", // máximo ancho en pantallas grandes
                cursor: "pointer",
                minWidth: "250px", // mínimo ancho para que no se vea muy pequeño en tablets
              }}
            />
          </div>
          <PromocionesVideo />
        </div>
      </div>
    </>
  );
}
