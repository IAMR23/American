import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config"

const CrearPlanModal = ({ show, onClose, productId, onPlanCreado }) => {

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    interval_unit: "MONTH",     // valor por defecto
    interval_count: "1",         // 1 mes por defecto
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(`${API_URL}/paypal/producto/${productId}/plan`, {
        ...form,
        precio: parseFloat(form.precio),
        interval_count: parseInt(form.interval_count),
      });

      onPlanCreado?.();

      setForm({
        nombre: "",
        descripcion: "",
        precio: "",
        interval_unit: "MONTH",
        interval_count: "1",
      });

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Error al crear plan");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Crear Plan</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>

            <div className="modal-body">

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Nombre del Plan</label>
                  <input
                    type="text"
                    name="nombre"
                    className="form-control"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Precio (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="precio"
                    className="form-control"
                    value={form.precio}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Descripción</label>
                <textarea
                  name="descripcion"
                  className="form-control"
                  rows="2"
                  value={form.descripcion}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>

              {/* Duración por unidad */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Unidad de tiempo</label>
                  <select
                    name="interval_unit"
                    className="form-control"
                    value={form.interval_unit}
                    onChange={handleChange}
                    required
                  >
                    <option value="DAY">Días</option>
                    <option value="WEEK">Semanas</option>
                    <option value="MONTH">Meses</option>
                    <option value="YEAR">Años</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Cantidad</label>
                  <input
                    type="number"
                    name="interval_count"
                    className="form-control"
                    value={form.interval_count}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>
              </div>

              {error && <div className="text-danger">{error}</div>}
              <hr />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cerrar
              </button>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Creando..." : "Crear Plan"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CrearPlanModal;
