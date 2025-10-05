// src/context/ReproductorContext.jsx
import { createContext, useState } from "react";

export const ReproductorContext = createContext();

export const ReproductorProvider = ({ children }) => {
  const [cola, setCola] = useState([]);
  const [cancionActual, setCancionActual] = useState(null);

  return (
    <ReproductorContext.Provider value={{ cola, setCola, cancionActual, setCancionActual }}>
      {children}
    </ReproductorContext.Provider>
  );
};
