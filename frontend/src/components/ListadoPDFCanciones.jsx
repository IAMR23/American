import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { API_URL } from "../config";

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

 const generarPDF = (orden) => {
  const doc = new jsPDF();
  let titulo = "AMERICAN KARAOKE - LISTA POR ";

  let cancionesOrdenadas = [...canciones];

  if (orden === "artista") {
    titulo += "ARTISTA";
    cancionesOrdenadas.sort((a, b) => {
      const artA = (a.artista || "").toLowerCase();
      const artB = (b.artista || "").toLowerCase();
      return artA.localeCompare(artB);
    });
  } else if (orden === "cancion") {
    titulo += "CANCION";
    cancionesOrdenadas.sort((a, b) => {
      const titA = (a.titulo || "").toLowerCase();
      const titB = (b.titulo || "").toLowerCase();
      return titA.localeCompare(titB);
    });
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = doc.getTextWidth(titulo);
  const x = (pageWidth - textWidth) / 2;
  doc.text(titulo, x, 10);

  const data = cancionesOrdenadas.map((cancion, index) => [
    cancion.numero != null ? cancion.numero : index + 1,
    cancion.titulo || "Sin título",
    cancion.artista || "Sin artista",
    // si tienes el género poblado, mostrar nombre, si no, mostrar id o 'Sin género'
    canciones.generos && typeof canciones.generos === "object"
      ? canciones.generos.nombre || "Sin género"
      : canciones.generos || "Sin género",
  ]);

  autoTable(doc, {
    head: [["Nº", "Título", "Artista", "Género"]],
    body: data,
    startY: 20,
  });

  doc.save(`listado_canciones_por_${orden}.pdf`);
};


  return (
    <div className="">
      <div className="text-center mb-3">
        <button
          className="btn btn-danger me-2"
          onClick={() => generarPDF("cancion")}
        >
          Descargar PDF por Canción
        </button>
        <button
          className="btn btn-success"
          onClick={() => generarPDF("artista")}
        >
          Descargar PDF por Artista
        </button>
      </div>
    </div>
  );
};

export default ListadoPDFCanciones;
