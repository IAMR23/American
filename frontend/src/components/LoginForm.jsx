import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/userServices";
import { jwtDecode } from "jwt-decode"; // Sin llaves en jwtDecode
import { AuthContext } from "../utils/AuthContext";

function LoginForm({ onLoginSuccess }) {
  const { setAuth } = useContext(AuthContext);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false); // Estado para mostrar/ocultar contraseña
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
      const response = await loginUser(credentials);
      localStorage.setItem("token", response.token);

      const decoded = jwtDecode(response.token);
      const userRole = decoded.rol;
      const userId = decoded.userId;

      localStorage.setItem("rol", userRole);

      setAuth({
        isAuthenticated: true,
        rol: userRole,
        userId: userId,
      });

      if (userRole === "admin" || userRole === "cantante") {
        navigate("/");
        onLoginSuccess();
      }

      setCredentials({ email: "", password: "" });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Error al iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center h-full">
      <div
        className="card shadow mx-2"
        style={{ maxWidth: "400px", width: "100%" }}
      >
        <div className="card-body bg-primary text-white">
          <h2 className="card-title text-center mb-4">Iniciar Sesión</h2>

          {error && <p className="text-danger text-center">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={credentials.email}
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
                type={showPassword ? "text" : "password"} // Aquí se cambia el tipo
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
                id="showPassword"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label className="form-check-label" htmlFor="showPassword">
                Mostrar contraseña
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-dark w-100"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {loading && (
            <div className="text-center mt-3">
              <div className="spinner-border text-light" />
            </div>
          )}

          <div className="text-center mt-3">
            <a href="/registro" className="text-decoration-none text-white">
              ¿No tienes cuenta? Regístrate
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
