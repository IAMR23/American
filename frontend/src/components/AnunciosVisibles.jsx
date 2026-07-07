import React, { useEffect, useMemo, useState } from "react";
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

  const anunciosTexto = useMemo(
    () =>
      anuncios.map((anuncio) => ({
        id: anuncio._id || `${anuncio.titulo}-${anuncio.contenido}`,
        titulo: anuncio.titulo,
        contenido: anuncio.contenido,
      })),
    [anuncios],
  );

  if (error) return <p className="text-danger">{error}</p>;
  if (!Array.isArray(anuncios) || anuncios.length === 0) {
    return <p className="text-light"></p>;
  }

  return (
    <div className="anuncios-visibles text-white py-2 w-100 overflow-hidden position-relative">
      <div className="anuncios-visibles__track fs-2">
        {[0, 1].map((copyIndex) => (
          <div
            className="anuncios-visibles__group"
            key={`anuncios-copy-${copyIndex}`}
            aria-hidden={copyIndex === 1}
          >
            {anunciosTexto.map((anuncio) => (
              <div
                key={`${copyIndex}-${anuncio.id}`}
                className="anuncios-visibles__item px-4"
              >
                <strong>{anuncio.titulo}: </strong>
                {anuncio.contenido}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnunciosVisibles;
