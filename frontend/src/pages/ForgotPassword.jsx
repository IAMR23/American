import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");

    if (!email) {
      setError("Ingresa tu correo electrónico");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_URL}/forgot-password`,
        { email }
      );

      setMsg(res.data.message);
      setEmail("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo procesar la solicitud"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center  "
    >
      <div className="card shadow-lg" style={{ maxWidth: "600px"}}>
        <div className="card-body bg-primary rounded text-light">

          {/* LOGO */}
          <div className="text-center mb-4">
            <img
              src="/logo.png"
              alt="American Karaoke"
              style={{ width: "180px" }}
            />
          </div>

          <h3 className="text-center mb-3 fw-bold">
            Recuperar contraseña
          </h3>

          <p className=" text-center mb-4">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>

          {error && <div className="alert alert-danger text-center">{error}</div>}
          {msg && <div className="alert alert-success text-center">{msg}</div>}

          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">Correo electrónico</label>
              <input
                type="email"
                className="form-control"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              className="btn btn-danger w-100"
              type="submit"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>

          {loading && (
            <div className="text-center mt-3">
              <div className="spinner-border text-primary" />
            </div>
          )}

          <div className="text-center mt-4">
            <small className="text-muted">
              Si el correo existe, recibirás un mensaje con las instrucciones
            </small>
          </div>

        </div>
      </div>
    </div>
  );
}
