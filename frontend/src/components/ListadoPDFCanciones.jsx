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
      const res = await axios.get(`${API_URL}/song/numero`);
      setCanciones(res.data);
    } catch (error) {
      console.error("Error al obtener canciones:", error);
    }
  };

  const generarPDF = (orden) => {
    const doc = new jsPDF();
    let titulo = "AMERICAN KARAOKE - LISTA POR ";

    let cancionesOrdenadas = [...canciones];
    let head = [];
    let data = [];

    if (orden === "artista") {
      titulo += "ARTISTA";
      cancionesOrdenadas.sort((a, b) => {
        const artA = (a.artista || "").toLowerCase();
        const artB = (b.artista || "").toLowerCase();
        return artA.localeCompare(artB);
      });

      // Encabezado y datos para orden por artista
      head = [["Cantante", "Nº", "Canción", "Género"]];
      data = cancionesOrdenadas.map((cancion, index) => [
        cancion.artista || "Sin artista",
        cancion.numero != null ? cancion.numero : index + 1,
        cancion.titulo || "Sin título",
        typeof cancion.generos === "object"
          ? cancion.generos.nombre || "Sin género"
          : cancion.generos || "Sin género",
      ]);
    } else if (orden === "cancion") {
      titulo += "CANCION";
      cancionesOrdenadas.sort((a, b) => {
        const titA = (a.titulo || "").toLowerCase();
        const titB = (b.titulo || "").toLowerCase();
        return titA.localeCompare(titB);
      });

      // Encabezado y datos para orden por canción
      head = [["Canción", "Nº", "Cantante", "Género"]];
      data = cancionesOrdenadas.map((cancion, index) => [
        cancion.titulo || "Sin título",
        cancion.numero != null ? cancion.numero : index + 1,
        cancion.artista || "Sin artista",
        typeof cancion.generos === "object"
          ? cancion.generos.nombre || "Sin género"
          : cancion.generos || "Sin género",
      ]);
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(titulo);
    const x = (pageWidth - textWidth) / 2;
    doc.text(titulo, x, 10);

    autoTable(doc, {
      head: head,
      body: data,
      startY: 20,
    });

    doc.save(`listado_canciones_por_${orden}.pdf`);
  };

  return (
    <div>
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
          Descargar PDF por Cantante
        </button>
      </div>
    </div>
  );
};

export default ListadoPDFCanciones;
