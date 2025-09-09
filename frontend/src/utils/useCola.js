import { useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";
import { API_URL } from "../config";

export default function useCola() {
  const [cola, setCola] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modoReproduccion, setModoReproduccion] = useState("cola"); // "cola" o "playlist"
  const MIN_ANTERIORES = 2;

  const getColaVisible = () => {
    const start = currentIndex - MIN_ANTERIORES > 0 ? currentIndex - MIN_ANTERIORES : 0;
    const visibles = cola.slice(start);
    return visibles.filter((c) => c && c._id);
  };

  const cargarCola = async () => {
    try {
      const res = await axios.get(`${API_URL}/song/visibles`);
      const canciones = res.data.canciones || res.data;
      if (Array.isArray(canciones)) {
        setCola(canciones);
        setCurrentIndex(0);
        setModoReproduccion("cola");
        console.log("Cola cargada:", canciones);
      }
    } catch (err) {
      console.error("Error cargando canciones visibles", err);
    }
  };

  const reproducirCancion = (index, emitirCambiarCancion) => {
    setCurrentIndex(index);
    if (emitirCambiarCancion) emitirCambiarCancion(index);
  };

  const insertarEnColaDespuesActual = (nuevaCancion, emitirCola) => {
    if (!nuevaCancion || !nuevaCancion._id) return;

    setCola((prevCola) => {
      const index = currentIndex !== undefined ? currentIndex : prevCola.length - 1;
      const nuevaCola = [...prevCola];
      nuevaCola.splice(index + 1, 0, nuevaCancion);

      if (emitirCola) emitirCola(nuevaCola);

      console.log("Canción insertada en cola:", nuevaCancion);
      return nuevaCola;
    });
  };

  return {
    cola,
    setCola,
    currentIndex,
    setCurrentIndex,
    modoReproduccion,
    setModoReproduccion,
    getColaVisible,
    cargarCola,
    reproducirCancion,
    insertarEnColaDespuesActual,
  };
}
