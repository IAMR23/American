import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { API_URL } from "../config"

const ListadoPDFCanciones = () => {

  const [canciones, setCanciones] = useState([]);

  useEffect(() => {
    obtenerCanciones();
  }, []);

  const obtenerCanciones = async () => {
    try {
      const res = await axios.get(`${API_URL}/song`);
      setCanciones(res.data);
    } catch (error) {
      console.error("Error al obtener canciones:", error);
    }
  };

 const generarPDF = () => {
  const doc = new jsPDF();
  const titulo = "AMERICAN KARAOKE - LISTA POR ARTISTA";

  // Calcular el ancho de la página y del texto
  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = doc.getTextWidth(titulo);
  const x = (pageWidth - textWidth) / 2;

  // Agregar texto centrado
  doc.text(titulo, x, 10);

  const data = canciones.map((cancion, index) => [
    index + 1,
    cancion.artista || "Sin artista",
    cancion.titulo || "Sin título",
    Array.isArray(cancion.generos)
      ? cancion.generos.map((g) => g.nombre || g).join(", ")
      : "Sin género",
  ]);

  autoTable(doc, {
    head: [["Nº", "Artista", "Título", "Género"]],
    body: data,
    startY: 20,
  });

  doc.save("listado_canciones.pdf");
};


  return (
    <div className="container my-4">
      <div className="text-center">
        <button className="btn btn-danger mb-3" onClick={generarPDF}>
          Descargar PDF
        </button>
      </div>
    </div>
  );
};

export default ListadoPDFCanciones;
