import { createContext, useContext, useState, useEffect } from "react";

const BackgroundContext = createContext();

export const BackgroundProvider = ({ children }) => {
  const [background, setBackground] = useState(() => {
    //👇 Cargar desde localStorage al iniciar
    return localStorage.getItem("bg") || "";
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
