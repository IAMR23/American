import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiEdit, FiTrash2, FiEye, FiEyeOff } from "react-icons/fi";
import { API_URL } from "../config"



const API_ANUNCIOS = `${API_URL}/anuncio`;

export default function AnunciosCRUD() {
  const [anuncios, setAnuncios] = useState([]);
  const [form, setForm] = useState({
    titulo: "",
    contenido: "",
    visible: true,
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchAnuncios();
  }, []);

  const fetchAnuncios = async () => {
    try {
      const res = await axios.get(`${API_ANUNCIOS}`);
      setAnuncios(res.data);
    } catch (err) {
      console.error("Error al obtener anuncios", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json", // o application/json si no usas archivos
      };

      if (editId) {
        await axios.put(`${API_ANUNCIOS}/${editId}`, form, { headers });
      } else {
        await axios.post(API_ANUNCIOS, form, { headers });
      }

      setForm({ titulo: "", contenido: "", visible: true });
      setEditId(null);
      fetchAnuncios();
    } catch (err) {
      console.error("Error al guardar el anuncio", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };
      await axios.delete(`${API_ANUNCIOS}/${id}`, { headers });
      fetchAnuncios();
    } catch (err) {
      console.error("Error al eliminar el anuncio", err);
    }
  };

  const toggleVisible = async (anuncio) => {
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };
      await axios.put(
        `${API_ANUNCIOS}/${anuncio._id}`,
        {
          ...anuncio,
          visible: !anuncio.visible,
        },
        { headers }
      );
      fetchAnuncios();
    } catch (err) {
      console.error("Error al cambiar visibilidad", err);
    }
  };

  return (
    <div className="">
      <h1 className="text-center">Gestión de Anuncios</h1>

      {/* Botón para abrir el modal */}
      <div className="text-end mb-3">
        <button
          className="btn btn-primary"
          data-bs-toggle="modal"
          data-bs-target="#anuncioModal"
          onClick={() => {
            setForm({ titulo: "", contenido: "", visible: false });
            setEditId(null);
          }}
        >
          Crear Anuncio
        </button>
      </div>

      {/* Modal de Bootstrap */}
      <div
        className="modal fade"
        id="anuncioModal"
        tabIndex="-1"
        aria-labelledby="anuncioModalLabel"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title" id="anuncioModalLabel">
                  {editId ? "Editar Anuncio" : "Nuevo Anuncio"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Título</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.titulo}
                    onChange={(e) =>
                      setForm({ ...form, titulo: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Contenido</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={form.contenido}
                    onChange={(e) =>
                      setForm({ ...form, contenido: e.target.value })
                    }
                    required
                  ></textarea>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={form.visible}
                    onChange={(e) =>
                      setForm({ ...form, visible: e.target.checked })
                    }
                  />
                  <label className="form-check-label">Visible</label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  {editId ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Lista de anuncios */}
      <div className="mt-5">
        <h4 className="mb-3">Lista de Anuncios</h4>

        <table className="table table-bordered table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>Título</th>
              <th>Contenido</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {anuncios.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center">
                  No hay anuncios disponibles
                </td>
              </tr>
            ) : (
              anuncios.map((anuncio) => (
                <tr
                  key={anuncio._id}
                  className={anuncio.visible ? "" : "table-danger"}
                >
                  <td>{anuncio.titulo}</td>
                  <td>{anuncio.contenido}</td>
                  <td>
                    <span
                      className={`fw-bold ${
                        anuncio.visible ? "text-success" : "text-danger"
                      }`}
                    >
                      {anuncio.visible ? "Activo" : "Desactivado"}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        className="btn btn-warning btn-sm"
                        title="Editar"
                        onClick={() => {
                          setEditId(anuncio._id);
                          setForm({
                            titulo: anuncio.titulo,
                            contenido: anuncio.contenido,
                            visible: anuncio.visible,
                          });
                          const modal = new bootstrap.Modal(
                            document.getElementById("anuncioModal")
                          );
                          modal.show();
                        }}
                      >
                        <FiEdit />
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        title="Eliminar"
                        onClick={() => handleDelete(anuncio._id)}
                      >
                        <FiTrash2 />
                      </button>

                      <button
                        className={`btn btn-sm ${
                          anuncio.visible
                            ? "btn-outline-secondary"
                            : "btn-outline-success"
                        }`}
                        title={anuncio.visible ? "Desactivar" : "Activar"}
                        onClick={() => toggleVisible(anuncio)}
                      >
                        {anuncio.visible ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
