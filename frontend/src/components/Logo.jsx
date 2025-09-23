import React from "react";
import { useNavigate } from "react-router-dom";

export default function Logo() {
  const navigate = useNavigate();

  return (
    <div className="p-3">
      <div className="d-flex flex-wrap justify-content-center align-items-center w-100 gap-3 p-2">
        <img
          src="/icono.png"
          alt="icono"
          style={{ width: "60px", height: "auto" }}
        />
        <img
          onClick={() => navigate("/")}
          src="/logo.png"
          alt="logo"
          className="img-fluid"
          style={{
            width: "80%",
            maxWidth: "600px",
            cursor: "pointer",
            minWidth: "250px",
          }}
        />
      </div>
    </div>
  );
}
