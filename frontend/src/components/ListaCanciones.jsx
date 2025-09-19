import React, { useState, useEffect } from "react";
import "../styles/inicial.css";
import Canciones from "./Canciones";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../styles/botones.css";
import "../styles/disco.css";
import { API_URL } from "../config";

import { useNavigate } from "react-router-dom";
import { getToken } from "../utils/auth";
import UltimasSubidas from "./UltimasSubidas";
import ToastModal from "./modal/ToastModal";
import { io } from "socket.io-client";

export default function ListaCanciones() {
  const navigate = useNavigate();

  return (
    <>
      <div className="p-3">
        <div className="d-flex flex-wrap justify-content-center align-items-center w-100 gap-3 p-2">
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
              width: "80%",
              maxWidth: "600px",
              cursor: "pointer",
              minWidth: "250px",
            }}
          />
        </div>
      </div>
      <Canciones />
    </>
  );
}
