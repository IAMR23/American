import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/userServices";
import { jwtDecode } from "jwt-decode";

function LoginForm({ setToken, onLoginSuccess, onGoRegister, onGoPasswordReset }) {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!credentials.email || !credentials.password) {
      setError("Por favor completa todos los campos.");
      setLoading(false);
      return;
    }

    try {
      // ✅ loginUser devuelve directamente data
      const data = await loginUser(credentials);

      if (!data?.token) {
        throw new Error("El servidor no devolvió el token");
      }

      // ✅ Guardar token correctamente
      localStorage.setItem("token", data.token);
      setToken(data.token);

      // ✅ Decodificar token correcto
      const decoded = jwtDecode(data.token);
      const userRole = decoded.rol;

      localStorage.setItem("rol", userRole);

      if (userRole === "admin" || userRole === "cantante") {
        navigate("/");
        onLoginSuccess?.();
      }

      setCredentials({ email: "", password: "" });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Error al iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center h-full">
      <div className="card shadow mx-2" style={{ maxWidth: "600px", width: "100%" }}>
        <div className="card-body bg-primary text-white">
          <h2 className="card-title text-center mb-4">Iniciar Sesión</h2>

          {error && <p className="text-danger text-center">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={credentials.email}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={credentials.password}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label className="form-check-label">
                Mostrar contraseña
              </label>
            </div>

            <button type="submit" className="btn btn-dark w-100" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {loading && (
            <div className="text-center mt-3">
              <div className="spinner-border text-light" />
            </div>
          )}

          <div className="d-flex justify-content-center align-items-center gap-3 mt-3">
            <button
              type="button"
              className="btn btn-link text-white px-0"
              onClick={onGoRegister}
            >
              ¿No tienes cuenta? Regístrate
            </button>

            <span className="text-white-50">|</span>

            <button
              type="button"
              className="btn btn-link text-white px-0"
              onClick={onGoPasswordReset}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
