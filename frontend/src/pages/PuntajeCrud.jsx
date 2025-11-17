import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

const API_PUNTAJE = `${API_URL}/p/puntaje`;

export default function PuntajeCrud() {
  const [puntajes, setPuntajes] = useState([]);
  const [formData, setFormData] = useState({
    titulo : "",
    videoUrl: "",
    imagenUrl: "",
    weight: "",
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    obtenerPuntajes();
  }, []);

  const obtenerPuntajes = async () => {
    try {
      const res = await axios.get(API_PUNTAJE);
      setPuntajes(res.data);
    } catch (error) {
      console.error("Error al obtener los puntajes:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`${API_PUNTAJE}/${editId}`, formData);
      } else {
        await axios.post(API_PUNTAJE, formData);
      }

      // Reiniciar formulario y estado
      setFormData({ titulo :"",videoUrl: "", imagenUrl: "", weight: "" });
      setEditId(null);
      obtenerPuntajes();
      cerrarModal();
    } catch (error) {
      console.error("Error al guardar el puntaje:", error);
    }
  };

  // 🔹 Nuevo: abrir modal (como tu ejemplo de canciones)
  const handleOpenModal = (puntaje = null) => {
    if (puntaje) {
      // Modo editar
      setEditId(puntaje._id);
      setFormData({
        titulo : puntaje.titulo || "",
        videoUrl: puntaje.videoUrl || "",
        imagenUrl: puntaje.imagenUrl || "",
        weight: puntaje.weight || "",
      });
    } else {
      // Modo nuevo → limpiar campos
      setEditId(null);
      setFormData({
        videoUrl: "",
        imagenUrl: "",
        weight: "",
      });
    }
    new window.bootstrap.Modal(document.getElementById("puntajeModal")).show();
  };

  const cerrarModal = () => {
    const modal = window.bootstrap.Modal.getInstance(
      document.getElementById("puntajeModal")
    );
    if (modal) modal.hide();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro?")) return;
    try {
      await axios.delete(`${API_PUNTAJE}/${id}`);
      obtenerPuntajes();
    } catch (error) {
      console.error("Error al eliminar el puntaje:", error);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Gestión de Puntajes</h2>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-lg"></i> Agregar Puntaje
        </button>
      </div>

      {/* Modal Formulario */}
      <div
        className="modal fade"
        id="puntajeModal"
        tabIndex="-1"
        aria-labelledby="puntajeModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow">
            <div className="modal-header">
              <h5 className="modal-title" id="puntajeModalLabel">
                {editId ? "Editar Puntaje" : "Agregar Puntaje"}
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit} className="row g-3">

                 <div className="col-12">
                  <label className="form-label">Titulo</label>
                  <input
                    type="text"
                    className="form-control"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Video URL</label>
                  <input
                    type="text"
                    className="form-control"
                    name="videoUrl"
                    value={formData.videoUrl}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Imagen URL</label>
                  <input
                    type="text"
                    className="form-control"
                    name="imagenUrl"
                    value={formData.imagenUrl}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Probabilidad de Salir</label>
                  <input
                    type="number"
                    className="form-control"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-12 text-end">
                  <button type="submit" className="btn btn-success">
                    {editId ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de puntajes */}
      {puntajes.length === 0 ? (
        <div className="alert alert-info text-center">
          No hay registros aún.
        </div>
      ) : (
        <div className="row g-4">
          {puntajes.map((p) => (
            <div className="col-md-4" key={p._id}>
              <div className="card h-100 shadow-sm border-0">
                <h1>{p.titulo}</h1>
                {/* {p.imagenUrl ? (
                  <img
                    src={p.imagenUrl}
                    className="card-img-top"
                    alt="Preview"
                    style={{ height: "180px", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="bg-light d-flex align-items-center justify-content-center"
                    style={{ height: "180px" }}
                  >
                    <i className="bi bi-image text-secondary fs-1"></i>
                  </div>
                )} */}

                <div className="card-body">
                  <h5 className="card-title text-truncate">
                    <a
                      href={p.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="link-primary"
                    >
                      Ver Video
                    </a>
                  </h5>
                  <p className="card-text">
                    <strong>Peso:</strong> {p.weight}
                  </p>
                </div>

                <div className="card-footer bg-transparent border-0 d-flex justify-content-between">
                  <button
                    className="btn btn-outline-warning btn-sm"
                    onClick={() => handleOpenModal(p)}
                  >
                    <i className="bi bi-pencil"></i> Editar
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDelete(p._id)}
                  >
                    <i className="bi bi-trash"></i> Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
