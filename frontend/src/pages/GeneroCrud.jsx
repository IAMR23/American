import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { API_URL } from "../config"

const API_GENERO = `${API_URL}/genero`;

export default function GeneroCRUD() {
  const [generos, setGeneros] = useState([]);
  const [form, setForm] = useState({ nombre: "" });
  const [editId, setEditId] = useState(null);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };

  const fetchGeneros = async () => {
    try {
      const res = await axios.get(API_GENERO, { headers });
      setGeneros(res.data.genero);
    } catch (error) {
      console.error("Error al obtener géneros:", error);
    }
  };

  useEffect(() => {
    fetchGeneros();
  }, []);

  const handleOpenModal = (genero = null) => {
    if (genero) {
      setEditId(genero._id);
      setForm({ nombre: genero.nombre });
    } else {
      setEditId(null);
      setForm({ nombre: "" });
    }
    const modal = new window.bootstrap.Modal(document.getElementById("generoModal"));
    modal.show();

    setTimeout(() => {
      const input = document.querySelector('#generoModal input[type="text"]');
      if (input) input.focus();
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("nombre", form.nombre);

    try {
      if (editId) {
        await axios.put(`${API_GENERO}/${editId}`, formData, { headers });
      } else {
        await axios.post(API_GENERO, formData, { headers });
      }
      setForm({ nombre: "" });
      setEditId(null);
      fetchGeneros();

      const modalEl = document.getElementById("generoModal");
      const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
    } catch (error) {
      console.error("Error al guardar género:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este género?")) return;
    try {
      await axios.delete(`${API_GENERO}/${id}`, { headers });
      fetchGeneros();
    } catch (error) {
      console.error("Error al eliminar género:", error);
    }
  };

  return (
    <div className="container-fluid px-3 px-md-5">
      <h2 className="my-4 text-center">Gestión de Géneros</h2>
      <div className="text-end mb-3">
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
           Crear Género
        </button>
      </div>

      {generos.length === 0 ? (
        <p>No hay géneros registrados.</p>
      ) : (
        <div
          className="d-grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          }}
        >
          {generos.map((genero) => (
            <div
              key={genero._id}
              className="card p-3 shadow-sm text-center position-relative"
            >
              <h5 className="card-title">{genero.nombre}</h5>
              <div className="d-flex justify-content-center gap-2 ">
                <button
                  className="btn btn-warning btn-sm"
                  title="Editar"
                  onClick={() => handleOpenModal(genero)}
                >
                  <FiEdit size={24}/>
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  title="Eliminar"
                  onClick={() => handleDelete(genero._id)}
                >
                  <FiTrash2 size={24} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de creación/edición */}
      <div
        className="modal fade"
        id="generoModal"
        tabIndex="-1"
        aria-labelledby="generoModalLabel"
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-dialog">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title" id="generoModalLabel">
                {editId ? "Editar Género" : "Crear Género"}
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Cerrar"
                id="closeModalBtn"
              ></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="submit" className="btn btn-primary">
                {editId ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
