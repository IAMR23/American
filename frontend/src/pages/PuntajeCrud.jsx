import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

const API_PUNTAJE = `${API_URL}/p/puntaje`;

export default function PuntajeCrud() {
  const [puntajes, setPuntajes] = useState([]);
  const [formData, setFormData] = useState({
    titulo: "",
    videoUrl: "",
    imagenUrl: "",
    weight: "",
    key: "",
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

      setFormData({
        titulo: "",
        videoUrl: "",
        imagenUrl: "",
        weight: "",
        key: "",
      });

      setEditId(null);
      obtenerPuntajes();
      cerrarModal();
    } catch (error) {
      console.error("Error al guardar el puntaje:", error);
    }
  };

  const handleOpenModal = (puntaje = null) => {
    if (puntaje) {
      setEditId(puntaje._id);
      setFormData({
        titulo: puntaje.titulo || "",
        videoUrl: puntaje.videoUrl || "",
        imagenUrl: puntaje.imagenUrl || "",
        weight: puntaje.weight || "",
        key: puntaje.key || "",
      });
    } else {
      setEditId(null);
      setFormData({
        titulo: "",
        videoUrl: "",
        imagenUrl: "",
        weight: "",
        key: "",
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
        <h2 className="fw-bold">Gestión de Calificaciones</h2>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-lg"></i> Agregar Calificación
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
              <button type="button" className="btn-close"></button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit} className="row g-3">
                
                <div className="col-12">
                  <label className="form-label">Título</label>
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

                {/* 🔹 NUEVO CAMPO: TECLA */}
                <div className="col-12">
                  <label className="form-label">Tecla Asignada</label>
                  <input
                    type="text"
                    className="form-control"
                    name="key"
                    value={formData.key}
                    onChange={handleChange}
                    maxLength={3}
                    placeholder="Ej: 1, 2, F1, A"
                    
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

      {/* Cards */}
      {puntajes.length === 0 ? (
        <div className="alert alert-info text-center">No hay registros aún.</div>
      ) : (
        <div className="row g-4">
          {puntajes.map((p) => (
            <div className="col-md-4" key={p._id}>
              <div className="card h-100 shadow-sm border-0">

                <div className="card-body">
                  <h4 className="card-title fw-bold">{p.titulo}</h4>

                  <p className="card-text">
                    <strong>Video:</strong>{" "}
                    <a href={p.videoUrl} target="_blank" rel="noreferrer">
                      Ver
                    </a>
                  </p>

                  <p className="card-text">
                    <strong>Probabilidad:</strong> {p.weight}
                  </p>

                  <p className="card-text">
                    <strong>Tecla:</strong> {p.key}
                  </p>
                </div>

                <div className="card-footer bg-transparent border-0 d-flex justify-content-between">
                  <button
                    className="btn btn-outline-warning btn-sm"
                    onClick={() => handleOpenModal(p)}
                  >
                    Editar
                  </button>

                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDelete(p._id)}
                  >
                    Eliminar
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
