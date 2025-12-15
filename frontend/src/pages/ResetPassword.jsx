import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");

    if (!token) {
      setError("Token inválido o expirado");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/reset-password`, {
        token,
        newPassword: password,
      });

      setMsg(res.data.message || "Contraseña cambiada correctamente");

      setTimeout(() => navigate("/"), 2500);
    } catch (err) {
      setError(
        err.response?.data?.message || "Error al cambiar la contraseña"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100"
      style={{
        background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
      }}
    >
      <div className="card shadow-lg">
        <div className="card-body bg-dark text-white rounded">

          {/* LOGO */}
          <div className="text-center mb-4">
            <img src="/logo.png" alt="American Karaoke" />
          </div>

          <h3 className="text-center mb-3">Restablecer contraseña</h3>

          {error && <div className="alert alert-danger text-center">{error}</div>}
          {msg && <div className="alert alert-success text-center">{msg}</div>}

          <form onSubmit={submit}>
            {/* Nueva contraseña */}
            <div className="mb-3">
              <label className="form-label">Nueva contraseña</label>
              <input
                type={show ? "text" : "password"}
                className="form-control"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Confirmar */}
            <div className="mb-3">
              <label className="form-label">Confirmar contraseña</label>
              <input
                type={show ? "text" : "password"}
                className="form-control"
                placeholder="********"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {/* Mostrar */}
            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={show}
                onChange={() => setShow(!show)}
                id="showPass"
              />
              <label className="form-check-label" htmlFor="showPass">
                Mostrar contraseña
              </label>
            </div>

            <button
              className="btn btn-danger w-100"
              type="submit"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>

          {loading && (
            <div className="text-center mt-3">
              <div className="spinner-border text-light" />
            </div>
          )}

          <div className="text-center mt-4">
            <small className="text-muted">
              Serás redirigido al login automáticamente
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
