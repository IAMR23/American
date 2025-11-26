import { useEffect, useState } from "react";
import CrearPlanModal from "./CrearPlanModal";
import React from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import PlanesActivos from "./PlanesActivos";
import { API_URL } from "../config"


export default function ProductoDetalle() {
  const { id } = useParams();
  const [mostrarModal, setMostrarModal] = useState(false);

  const [error, setError] = useState("");
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [planes, setPlanes] = useState([]);

  const fetchPlanes = async () => {
    try {
      setError("");
      setLoadingPlanes(true);
      const response = await axios.get(
        `${API_URL}/paypal/planes/${id}`
      );
      setPlanes(response.data || []);
    } catch (err) {
      console.error("Error al obtener planes:", err);
      setError("Error al obtener los planes. Intenta nuevamente.");
      setPlanes([]);
    } finally {
      setLoadingPlanes(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPlanes();
    }
  }, [id]);

  console.log(planes)

  return (
    <>
      <h1>Producto: {id}</h1>

      <button className="btn btn-success" onClick={() => setMostrarModal(true)}>
        Crear Plan
      </button>

      <CrearPlanModal
        show={mostrarModal}
        onClose={() => setMostrarModal(false)}
        productId={id}
        onPlanCreado={() => {
          fetchPlanes();
          setMostrarModal(false);
        }}
      />

      {error && <div className="alert alert-danger mt-3">{error}</div>}

      {loadingPlanes ? (
        <div className="mt-3">Cargando planes...</div>
      ) : (
        <table className="table table-bordered table-hover mt-3">
          <thead className="table-light">
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Frecuencia</th>
            </tr>
          </thead>
          <tbody>
            {planes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">
                  No hay planes para este producto.
                </td>
              </tr>
            ) : (
              planes.map((plan) => {
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
                    <td>{plan.status}</td>
                    <td>{plan.description || "—"}</td>
                    <td>
                      {precioMoneda} {precioValor}
                    </td>
                    <td>{frecuencia}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          
        </table>
      )}

      <PlanesActivos/>
    </>
  );
}
