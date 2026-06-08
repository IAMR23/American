import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaAd,
  FaBookOpen,
  FaChartLine,
  FaClipboardList,
  FaCompactDisc,
  FaFilePdf,
  FaHome,
  FaImages,
  FaMusic,
  FaStar,
  FaTags,
  FaUpload,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

const menuItems = [
  { to: "/", label: "American Karaoke", icon: FaHome },
  { to: "/subir-pdf", label: "Subir Pdf", icon: FaUpload },
  { to: "/promociones", label: "Galeria", icon: FaImages },
  { to: "/genero", label: "Generos", icon: FaTags },
  { to: "/miplaylist", label: "Playlist Sugeridas", icon: FaStar },
  { to: "/canciones", label: "Canciones", icon: FaMusic },
  { to: "/mas-reproducidas", label: "Las mas cantadas", icon: FaChartLine },
  {
    to: "/editar-mas-reproducidas",
    label: "Editar las mas cantadas",
    icon: FaCompactDisc,
  },
  { to: "/usuarios", label: "Usuarios", icon: FaUsers },
  { to: "/register-user", label: "Registrar Usuarios", icon: FaUserPlus },
  { to: "/anuncios", label: "Anuncios", icon: FaAd },
  { to: "/solicitudes", label: "Solicitudes", icon: FaClipboardList },
  { to: "/calificaciones", label: "Calificaciones", icon: FaBookOpen },
  { to: "/productos", label: "Planes", icon: FaFilePdf },
];

export default function Sidebar() {
  return (
    <div className="col-auto col-md-3 col-xl-2 px-sm-2 px-0 bg-primary text-light admin-sidebar">
      <div className="d-flex flex-column align-items-center align-items-sm-start px-2 px-sm-3 pt-2 text-white min-vh-100">
        <ul
          className="nav nav-pills flex-column mb-sm-auto mb-0 align-items-center align-items-sm-start w-100"
          id="menu"
        >
          {menuItems.map(({ to, label, icon: Icon }) => (
            <li className="nav-item w-100" key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `admin-sidebar-link nav-link align-middle d-flex align-items-center gap-2 ${
                    isActive ? "admin-sidebar-link-active" : ""
                  }`
                }
              >
                <Icon className="admin-sidebar-icon" aria-hidden="true" />
                <span className="d-none d-sm-inline">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
