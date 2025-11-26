import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config"

const Productos = () => {

  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "SERVICE",
    category: "SOFTWARE",
  });
  const [error, setError] = useState("");

  const cargarProductos = async () => {
    try {
      const res = await axios.get(`${API_URL}/paypal/productos`);
      setProductos(res.data);
    } catch (err) {
      console.error("Error al cargar productos:", err);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(`${API_URL}/paypal/crear-producto`, form);
      setForm({
        name: "",
        description: "",
        type: "SERVICE",
        category: "SOFTWARE",
      });
      setShowModal(false);
      cargarProductos();
    } catch (err) {
      setError(err.response?.data?.error || "Error al crear producto");
    }
  };

  const handleCardClick = (id) => {

    navigate(`/producto/${id}`);
    // Aquí luego puedes hacer navigate(`/producto/${id}`)
  };

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Productos</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Crear Producto
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">Crear Producto</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Descripción</label>
                    <textarea
                      name="description"
                      className="form-control"
                      rows="3"
                      value={form.description}
                      onChange={handleChange}
                      required
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Tipo</label>
                    <select
                      name="type"
                      className="form-select"
                      value={form.type}
                      onChange={handleChange}
                    >
                      <option value="SERVICE">Servicio</option>
                      <option value="PHYSICAL">Físico</option>
                      <option value="DIGITAL">Digital</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Categoría</label>
                    <select
                      name="category"
                      className="form-select"
                      value={form.category}
                      onChange={handleChange}
                    >
                      <option value="SOFTWARE">Software</option>
                      <option value="EDUCATION_AND_TRAINING_SERVICES">
                        Educación
                      </option>
                      <option value="ENTERTAINMENT_AND_MEDIA">
                        Entretenimiento
                      </option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                  {error && <div className="text-danger">{error}</div>}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Crear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lista de productos en cards */}
      <div className="row">
        {productos.map((prod) => (
          <div key={prod.id} className="col-md-4 mb-4">
            <div
              className="card h-100 shadow-sm cursor-pointer"
              style={{ cursor: "pointer" }}
              onClick={() => handleCardClick(prod.id)}
            >
              <div className="card-body">
                <h5 className="card-title">{prod.name}</h5>
                <p className="card-text">{prod.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Productos;
