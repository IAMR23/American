import { useEffect, useState } from "react";
import CrearPlanModal from "./CrearPlanModal";
import EditarPlanModal from "./EditarPlanModal";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FaBan, FaEdit } from "react-icons/fa";
import { API_URL } from "../config";
import { confirmAction, showError, showSuccess } from "../utils/swalAlerts";


export default function ProductoDetalle() {
  const { id } = useParams();
  const [mostrarModal, setMostrarModal] = useState(false);
  const [planEditando, setPlanEditando] = useState(null);
  const [desactivandoPlanId, setDesactivandoPlanId] = useState(null);

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

  const handleDesactivarPlan = async (plan) => {
    const confirmed = await confirmAction({
      title: "Desactivar plan",
      text: `¿Seguro que deseas desactivar el plan ${plan.name}? Ya no estará disponible para nuevas suscripciones.`,
      confirmButtonText: "Sí, desactivar",
    });
    if (!confirmed) return;

    setDesactivandoPlanId(plan.id);

    try {
      await axios.post(`${API_URL}/paypal/planes/${plan.id}/desactivar`);
      await fetchPlanes();
      showSuccess("Plan desactivado", `${plan.name} ya no acepta suscripciones.`);
    } catch (err) {
      console.error("Error al desactivar plan:", err);
      showError(
        "No se pudo desactivar el plan",
        err.response?.data?.error || "Intenta nuevamente.",
      );
    } finally {
      setDesactivandoPlanId(null);
    }
  };

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

      <EditarPlanModal
        show={Boolean(planEditando)}
        plan={planEditando}
        onClose={() => setPlanEditando(null)}
        onPlanActualizado={fetchPlanes}
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
              <th>Acciones</th>
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
                const ciclo =
                  plan.billing_cycles?.find(
                    (billingCycle) => billingCycle.tenure_type === "REGULAR",
                  ) || plan.billing_cycles?.[0];
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
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setPlanEditando(plan)}
                          disabled={
                            plan.status !== "ACTIVE" &&
                            plan.status !== "CREATED"
                          }
                          title="Editar plan"
                        >
                          <FaEdit className="me-1" aria-hidden="true" />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDesactivarPlan(plan)}
                          disabled={
                            plan.status !== "ACTIVE" ||
                            desactivandoPlanId === plan.id
                          }
                          title="Desactivar plan"
                        >
                          <FaBan className="me-1" aria-hidden="true" />
                          {desactivandoPlanId === plan.id
                            ? "Desactivando..."
                            : plan.status === "INACTIVE"
                              ? "Desactivado"
                              : "Desactivar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          
        </table>
      )}
    </>
  );
}
