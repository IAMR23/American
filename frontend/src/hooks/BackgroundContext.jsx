import { createContext, useContext, useState, useEffect } from "react";

const BackgroundContext = createContext();

export const BackgroundProvider = ({ children }) => {
  const [background, setBackground] = useState(() => {
    //👇 Cargar desde localStorage o usar un fondo por defecto
    return localStorage.getItem("bg") || "/fondos/1.webp";
  });

  useEffect(() => {
    //👇 Guardar cada vez que cambia
    if (background) {
      localStorage.setItem("bg", background);
    }
  }, [background]);

  return (
    <BackgroundContext.Provider value={{ background, setBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = () => useContext(BackgroundContext);
