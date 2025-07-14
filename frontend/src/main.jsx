import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "./styles/bootstrap.css";
import "@justinribeiro/lite-youtube";
import React from 'react';
import WhatsAppButton from "./components/WhatsAppButton.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <WhatsAppButton/>
  </StrictMode>
);
