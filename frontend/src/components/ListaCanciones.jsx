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
import Logo from "./Logo";

export default function ListaCanciones() {

  return (
    <>
     <Logo/>
      <Canciones />
    </>
  );
}
