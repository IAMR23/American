import React from "react";
import { Link, Outlet } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="col-auto col-md-3 col-xl-2 px-sm-2 px-0 bg-primary text-light">
      <div className="d-flex flex-column align-items-center align-items-sm-start px-3 pt-2 text-white min-vh-100">
        <ul
          className="nav nav-pills flex-column mb-sm-auto mb-0 align-items-center align-items-sm-start"
          id="menu"
        >
                   <li>
            <Link to="/" className="nav-link px-0 align-middle">
              <i className="fs-4 bi-table"></i>
              <span className="ms-1 d-none d-sm-inline text-light">
                American Karaoke
              </span>
            </Link>
          </li>
          <li>
            <Link to="/promociones" className="nav-link px-0 align-middle">
              <i className="fs-4 bi-table"></i>
              <span className="ms-1 d-none d-sm-inline text-light">
                Publicaciones
              </span>
            </Link>
          </li>
          <li>
            <Link to="/genero" className="nav-link px-0 align-middle">
              <i className="fs-4 bi-table"></i>
              <span className="ms-1 d-none d-sm-inline text-light">
                Géneros
              </span>
            </Link>
          </li>
          <li>
            <Link to="/canciones" className="nav-link px-0 align-middle">
              <i className="fs-4 bi-table"></i>
              <span className="ms-1 d-none d-sm-inline text-light">
                Canciones
              </span>
            </Link>
          </li>
          <li>
            <Link to="/canciones" className="nav-link px-0 align-middle">
              <i className="fs-4 bi-table"></i>
              <span className="ms-1 d-none d-sm-inline text-light">
                Mas escuchadas
              </span>
            </Link>
          </li>

          <li>
            <Link to="/usuarios" className="nav-link px-0 align-middle">
              <i className="fs-4 bi-table"></i>
              <span className="ms-1 d-none d-sm-inline text-light">
                Usuarios
              </span>
            </Link>
          </li>
          <li>
            <Link to="/anuncios" className="nav-link px-0 align-middle">
              <i className="fs-4 bi-table"></i>
              <span className="ms-1 d-none d-sm-inline text-light">
                Anuncios
              </span>
            </Link>
          </li>
          <li>
            <Link to="/solicitudes" className="nav-link px-0 align-middle">
              <i className="fs-4 bi-table"></i>
              <span className="ms-1 d-none d-sm-inline text-light">
                Solicitudes
              </span>
            </Link>
          </li>
          <li>
            <Link to="/productos" className="nav-link px-0 align-middle">
              <i className="fs-4 bi-table"></i>
              <span className="ms-1 d-none d-sm-inline text-light">Planes</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
