import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import React from "react";
import { AuthContext } from "../utils/AuthContext";
import api from "../services/axiosConfig";
import { removeToken } from "../utils/auth";

export default function Navbar() {
  const authContext = useContext(AuthContext) || {};
  const {
    auth = { isAuthenticated: false, rol: null, userId: null },
    setAuth,
    logout,
  } = authContext;
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      } else {
        await api.post("/api/auth/logout");
      }
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
    } finally {
      removeToken();
      localStorage.removeItem("roomId");
      localStorage.removeItem("roomOwnerId");
      setAuth?.({ isAuthenticated: false, rol: null, userId: null });
      navigate("/", { replace: true });
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary px-4">
      <div className="container-fluid">
        <button
          className="navbar-toggler ms-auto"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div
          className="collapse navbar-collapse justify-content-center"
          id="mainNavbar"
        >
          <ul className="navbar-nav d-flex flex-wrap align-items-center gap-3">
            <li className="nav-item">
              <Link className="nav-link" to="/planes">
                Planes
              </Link>
            </li>

            {(!auth.isAuthenticated || auth.rol !== "arrendador") && (
              <li className="nav-item">
                <Link className="nav-link" to="/favoritos">
                  Favoritos
                </Link>
              </li>
            )}

            <li className="nav-item">
              <Link className="nav-link fw-bold" to="/">
                AMERICAN KARAOKE
              </Link>
            </li>

            {!auth.isAuthenticated && (
              <>
                {/* <li className="nav-item">
                  <Link className="nav-link" to="/login">Login</Link>
                </li> */}
                <li className="nav-item">
                  <Link className="nav-link" to="/registro">
                    Registro
                  </Link>
                </li>
              </>
            )}

            {auth.isAuthenticated && auth.rol !== "cantante" && (
              <li className="nav-item">
                <Link className="nav-link" to="/dashboard">
                  Dashboard
                </Link>
              </li>
            )}

            {auth.isAuthenticated && (
              <li className="nav-item">
                <button className="btn btn-danger" onClick={handleLogout}>
                  Cerrar Sesión
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
