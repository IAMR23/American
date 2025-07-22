import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { getToken } from "../utils/auth";

const SONG_URL = `${API_URL}/song`;

const BuscadorTabla = () => {
  const [filtroActivo, setFiltroActivo] = useState("titulo");
  const [busqueda, setBusqueda] = useState("");
  const [data, setData] = useState([]);

  const fetchCanciones = async () => {
    try {
      const headers = localStorage.getItem("token")
        ? { Authorization: `Bearer ${getToken()}` }
        : {};
      const res = await axios.get(SONG_URL, { headers });
      setData(res.data.canciones || res.data);
    } catch (err) {
      console.error("Error al obtener canciones", err);
    }
  };

  useEffect(() => {
    fetchCanciones();
  }, []);

  const handleFiltroClick = (tipo) => setFiltroActivo(tipo);

  const handleBusqueda = (e) => setBusqueda(e.target.value.toLowerCase());

  const filtrar = (fila) => {
    let valor = "";

    if (filtroActivo === "generos") {
      // Ahora generos es objeto, no array
      valor = fila.generos?.nombre?.toLowerCase() || "";
    } else {
      valor = fila[filtroActivo]?.toString().toLowerCase() || "";
    }

    return valor.includes(busqueda);
  };

  const datosFiltrados = data.filter(filtrar);

  return (
    <div className="">
      <div className="d-flex align-items-center flex-wrap">
        {["numero" , "titulo", "artista", "generos"].map((tipo) => (
          <button
            key={tipo}
            onClick={() => handleFiltroClick(tipo)}
            className={`btn me-2 ${
              filtroActivo === tipo ? "btn-danger" : "btn-primary"
            }`}
          >
            {tipo}
          </button>
        ))}

        <input
          type="text"
          className="form-control ms-2"
          style={{ width: "auto" }}
          placeholder="Buscar..."
          onChange={handleBusqueda}
        />
      </div>

      <div style={{ maxHeight: "600px", overflowY: "scroll" }}>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Número</th>
              <th>Título</th>
              <th>Artista</th>
              <th>Género</th>
            </tr>
          </thead>
          <tbody>
            {datosFiltrados.map((fila) => (
              <tr key={fila._id}>
                <td>{fila.numero}</td>
                <td>{fila.titulo}</td>
                <td>{fila.artista}</td>
                <td>{fila.generos?.nombre || "Sin género"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BuscadorTabla;
