import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import "../styles/AnunciosVisibles.css";

const AnunciosVisibles = () => {
  const [anuncios, setAnuncios] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnuncios = async () => {
      try {
        const res = await axios.get(`${API_URL}/anuncio/visible`);

        console.log("API_URL:", API_URL);
        console.log("Respuesta anuncios:", res.data);
        console.log("Es array:", Array.isArray(res.data));

        const data = Array.isArray(res.data) ? res.data : [];
        setAnuncios(data);
      } catch (err) {
        console.error("Error al cargar anuncios:", err);
        setError("Error al cargar los anuncios");
        setAnuncios([]);
      }
    };

    fetchAnuncios();
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!Array.isArray(anuncios) || anuncios.length === 0) {
    return <p className="text-light"></p>;
  }

  return (
    <div className="text-white py-2 w-100 overflow-hidden position-relative">
      <div className="marquee d-flex fs-2">
        {anuncios.map((anuncio, index) => (
          <div key={index} className="px-4">
            <strong>{anuncio.titulo}: </strong>
            {anuncio.contenido}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnunciosVisibles;