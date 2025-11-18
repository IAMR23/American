import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#8dd1e1",
  "#d0ed57",
  "#a4de6c",
  "#d88884",
];

export default function MasReproducidas() {
  const [canciones, setCanciones] = useState([]);

  useEffect(() => {
    const fetchCanciones = async () => {
      try {
        const res = await axios.get(`${API_URL}/song/masreproducidas`);
        setCanciones(res.data);
      } catch (err) {
        console.error("Error al obtener canciones populares", err);
      }
    };
    fetchCanciones();
  }, []);

  const dataBar = canciones.map((c) => ({
    nombre: c.titulo,
    reproducciones: c.reproducciones,
  }));

  const dataPie = Object.values(
    canciones.reduce((acc, c) => {
      const genero = c.generos?.nombre || "Desconocido";
      if (!acc[genero]) acc[genero] = { genero, reproducciones: 0 };
      acc[genero].reproducciones += c.reproducciones;
      return acc;
    }, {})
  );

  return (
    <div style={{ padding: "2rem" }}>
      <h2 className=" mb-4">🎶 Top 20 Canciones Más cantadas</h2>

      <div className="mb-4">
        <ul className="list-group shadow-sm rounded overflow-hidden">
          {canciones.map((c) => (
            <li
              key={c._id}
              className="
          list-group-item 
          d-flex 
          justify-content-between 
          align-items-center 
          py-3 
          px-3 
          flex-column flex-md-row
        "
              style={{
                borderLeft: "4px solid #0d6efd",
                background: "#ffffff",
              }}
            >
              {/* Texto */}
              <div className="text-center text-md-start">
                <h6 className="mb-1 fw-bold">
                  #{c.numero} — {c.titulo}
                </h6>

                <small className="text-muted d-block">{c.artista}</small>

                <span className="badge bg-secondary mt-2">
                  {c.generos?.nombre || "Sin género"}
                </span>
              </div>

              {/* Reproducciones */}
              <div className="mt-3 mt-md-0">
                <span className="badge bg-primary p-2 px-3 fs-6 shadow-sm">
                  🎧 {c.reproducciones}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="row">
        <div className="col-md-6">
          <h5 className="">📊 Reproducciones por Canción</h5>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={dataBar} layout="vertical" margin={{ left: 30 }}>
              <XAxis type="number" />
              <YAxis dataKey="nombre" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="reproducciones" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
