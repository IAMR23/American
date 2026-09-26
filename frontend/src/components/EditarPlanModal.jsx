import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

const EMPTY_FORM = {
  nombre: "",
  descripcion: "",
  precio: "",
};

export default function EditarPlanModal({
  show,
  plan,
  onClose,
  onPlanActualizado,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show || !plan) return;

    const cicloRegular =
      plan.billing_cycles?.find((cycle) => cycle.tenure_type === "REGULAR") ||
      plan.billing_cycles?.[0];

    setForm({
      nombre: plan.name || "",
      descripcion: plan.description || "",
      precio: cicloRegular?.pricing_scheme?.fixed_price?.value || "",
    });
    setError("");
  }, [plan, show]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.patch(`${API_URL}/paypal/planes/${plan.id}`, {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        precio: Number(form.precio),
      });
      await onPlanActualizado?.();
      onClose();
    } catch (err) {
      console.error("Error al actualizar plan:", err);
      setError(
        err.response?.data?.error ||
          "No se pudo actualizar el plan. Intenta nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!show || !plan) return null;

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editar-plan-title"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title" id="editar-plan-title">
                Editar plan
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
                disabled={loading}
              ></button>
            </div>

            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="editar-plan-nombre">
                    Nombre del plan
                  </label>
                  <input
                    id="editar-plan-nombre"
                    type="text"
                    name="nombre"
                    className="form-control"
                    value={form.nombre}
                    onChange={handleChange}
                    maxLength="127"
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="editar-plan-precio">
                    Precio (USD)
                  </label>
                  <input
                    id="editar-plan-precio"
                    type="number"
                    name="precio"
                    className="form-control"
                    value={form.precio}
                    onChange={handleChange}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label
                  className="form-label"
                  htmlFor="editar-plan-descripcion"
                >
                  Descripción
                </label>
                <textarea
                  id="editar-plan-descripcion"
                  name="descripcion"
                  className="form-control"
                  rows="3"
                  value={form.descripcion}
                  onChange={handleChange}
                  maxLength="127"
                  required
                ></textarea>
              </div>

              <div className="alert alert-warning mb-0" role="note">
                El precio nuevo se enviará a PayPal y se aplicará a los próximos
                ciclos de facturación. La frecuencia del plan no cambiará.
              </div>

              {error && (
                <div className="alert alert-danger mt-3 mb-0" role="alert">
                  {error}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
