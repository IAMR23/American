import { useEffect, useState } from "react";
import React from "react";
import axios from "axios";
import { API_URL } from "../config"

export default function PlanesActivos({ id }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [planesActivos, setPlanesActivos] = useState([]);


  const fetchPlanesActivos = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/paypal/planes/${id}`
      );
      const todosLosPlanes = response.data || [];

      const activos = todosLosPlanes.filter((plan) => plan.status === "ACTIVE");
      setPlanesActivos(activos);
    } catch (err) {
      console.error("Error al obtener planes activos:", err);
      setError("No se pudieron obtener los planes activos.");
      setPlanesActivos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPlanesActivos();
    }
  }, [id]);

  return (
    <>
      <h2 className="mt-4">Planes Activos del Producto {id}</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div>Cargando planes activos...</div>
      ) : planesActivos.length === 0 ? (
        <div>No hay planes activos para este producto.</div>
      ) : (
        <table className="table table-bordered table-striped mt-3">
          <thead className="table-light">
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Frecuencia</th>
            </tr>
          </thead>
          <tbody>
            {planesActivos.map((plan) => {
              const ciclo = plan.billing_cycles?.[0];
              const frecuencia = ciclo?.frequency
                ? `${ciclo.frequency.interval_unit} x${ciclo.frequency.interval_count}`
                : "—";

              const precioValor =
                ciclo?.pricing_scheme?.fixed_price?.value || "—";
              const precioMoneda =
                ciclo?.pricing_scheme?.fixed_price?.currency_code || "";

              return (
                <tr key={plan.id}>
                  <td>{plan.name}</td>
                  <td>{plan.description || "—"}</td>
                  <td>
                    {precioMoneda} {precioValor}
                  </td>
                  <td>{frecuencia}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
