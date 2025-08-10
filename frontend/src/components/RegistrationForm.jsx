import React, { useState } from "react";
import { registerUser } from "../services/userServices";

function RegistrationForm() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      const { nombre, email, password } = formData;
      await registerUser({ nombre, email, password });
      setSuccess("Usuario registrado exitosamente.");
      setFormData({
        nombre: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      setError(error.response?.data?.message || "Error al registrar usuario.");
    } finally {
      setLoading(false);
    }
  };

  const contrasenasCoinciden =
    formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  return (
    <div className="d-flex justify-content-center align-items-center">
      <div
        className="card shadow bg-primary"
        style={{ maxWidth: "700px", width: "100%" }}
      >
        <div className="card-body">
          <h2 className="card-title text-center mb-4 text-white">Registro</h2>

          {error && <p className="text-danger text-center">{error}</p>}
          {success && <p className="text-success text-center">{success}</p>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="nombre" className="form-label">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                id="password"
                type={mostrarPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">
                Confirmar Contraseña
              </label>
              <input
                id="confirmPassword"
                type={mostrarPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-control ${
                  formData.confirmPassword.length > 0
                    ? contrasenasCoinciden
                      ? "is-valid"
                      : "is-invalid"
                    : ""
                }`}
                required
              />
              {formData.confirmPassword.length > 0 && !contrasenasCoinciden && (
                <div className="invalid-feedback">Las contraseñas no coinciden</div>
              )}
              {formData.confirmPassword.length > 0 && contrasenasCoinciden && (
                <div className="valid-feedback">Las contraseñas coinciden</div>
              )}
            </div>

            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="mostrarPassword"
                checked={mostrarPassword}
                onChange={() => setMostrarPassword(!mostrarPassword)}
              />
              <label className="form-check-label" htmlFor="mostrarPassword">
                Mostrar Contraseña
              </label>
            </div>

            <button type="submit" className="btn btn-dark w-100" disabled={loading}>
              {loading ? "Registrando..." : "Registrarse"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegistrationForm;
