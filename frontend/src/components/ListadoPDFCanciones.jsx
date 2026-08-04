import { useEffect, useRef, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { API_URL } from "../config";

const ListadoPDFCanciones = ({ autoDownloadOrden = null }) => {
  const [canciones, setCanciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const autoDownloadDoneRef = useRef(false);

  useEffect(() => {
    obtenerCanciones();
  }, []);

  const obtenerCanciones = async () => {
    setCargando(true);
    setError("");

    try {
      const res = await axios.get(`${API_URL}/song/numero`);
      setCanciones(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error al obtener canciones:", error);
      setError("No se pudieron cargar las canciones");
    } finally {
      setCargando(false);
    }
  };

  const getGeneroNombre = (generos) =>
    typeof generos === "object"
      ? generos?.nombre || "Sin genero"
      : generos || "Sin genero";

  const generarPDF = (orden) => {
    if (!canciones.length) {
      setError("No hay canciones disponibles para generar el PDF");
      return;
    }

    const doc = new jsPDF();
    let titulo = "AMERICAN KARAOKE - LISTA POR ";
    const cancionesOrdenadas = [...canciones];
    let head = [];
    let data = [];

    if (orden === "artista") {
      titulo += "ARTISTA";
      cancionesOrdenadas.sort((a, b) =>
        (a.artista || "").toLowerCase().localeCompare(
          (b.artista || "").toLowerCase(),
        ),
      );

      head = [["Cantante", "Nro", "Cancion", "Genero"]];
      data = cancionesOrdenadas.map((cancion, index) => [
        cancion.artista || "Sin artista",
        cancion.numero != null ? cancion.numero : index + 1,
        cancion.titulo || "Sin titulo",
        getGeneroNombre(cancion.generos),
      ]);
    } else {
      titulo += "CANCION";
      cancionesOrdenadas.sort((a, b) =>
        (a.titulo || "").toLowerCase().localeCompare(
          (b.titulo || "").toLowerCase(),
        ),
      );

      head = [["Cancion", "Nro", "Cantante", "Genero"]];
      data = cancionesOrdenadas.map((cancion, index) => [
        cancion.titulo || "Sin titulo",
        cancion.numero != null ? cancion.numero : index + 1,
        cancion.artista || "Sin artista",
        getGeneroNombre(cancion.generos),
      ]);
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(titulo);
    const x = (pageWidth - textWidth) / 2;
    doc.text(titulo, x, 10);

    autoTable(doc, {
      head,
      body: data,
      startY: 20,
    });

    doc.save(`listado_canciones_por_${orden}.pdf`);
  };

  useEffect(() => {
    if (!autoDownloadOrden || autoDownloadDoneRef.current || !canciones.length) {
      return;
    }

    autoDownloadDoneRef.current = true;
    generarPDF(autoDownloadOrden);
  }, [autoDownloadOrden, canciones]);

  return (
    <div className="container py-4">
      <div className="text-center mb-3">
        {autoDownloadOrden && (
          <div className="mb-3">
            <h1 className="h4 fw-bold">Listado PDF de canciones</h1>
            <p className="text-muted mb-0">
              {cargando
                ? "Preparando PDF..."
                : "Si la descarga no inicia automaticamente, usa el boton."}
            </p>
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        <button
          className="btn btn-danger me-2"
          onClick={() => generarPDF("cancion")}
          disabled={cargando || !canciones.length}
        >
          Descargar PDF por Cancion
        </button>
        <button
          className="btn btn-success"
          onClick={() => generarPDF("artista")}
          disabled={cargando || !canciones.length}
        >
          Descargar PDF por Cantante
        </button>
      </div>
    </div>
  );
};

export default ListadoPDFCanciones;
