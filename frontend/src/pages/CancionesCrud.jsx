import React, { useEffect, useState } from "react";
import axios from "axios";

    const API_URL2 = import.meta.env.VITE_API_URL;



const API_URL = `${API_URL2}/song`;
const GENEROS_URL = `${API_URL2}/genero`;

export default function CancionCRUD() {
  const [canciones, setCanciones] = useState([]);
  const [generos, setGeneros] = useState([]);
  const [form, setForm] = useState({
    titulo: "",
    artista: "",
    generos: [],
    videoUrl: "",
  });
  const [editId, setEditId] = useState(null);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };

  const fetchCanciones = async () => {
    try {
      const res = await axios.get(API_URL, { headers });
      setCanciones(res.data);
    } catch (error) {
      console.error("Error al obtener canciones:", error);
    }
  };

  const fetchGeneros = async () => {
    try {
      const res = await axios.get(GENEROS_URL, { headers });
      setGeneros(res.data.genero); // Asumes que viene como { genero: [...] }
    } catch (error) {
      console.error("Error al obtener géneros:", error);
    }
  };

  useEffect(() => {
    fetchCanciones();
    fetchGeneros();
  }, []);

  const handleOpenModal = (cancion = null) => {
    if (cancion) {
      setEditId(cancion._id);
      setForm({
        titulo: cancion.titulo,
        artista: cancion.artista,
        generos: cancion.generos.map((g) => g._id),
        videoUrl: cancion.videoUrl,
      });
    } else {
      setEditId(null);
      setForm({
        titulo: "",
        artista: "",
        generos: [],
        videoUrl: "",
      });
    }
    new window.bootstrap.Modal(document.getElementById("cancionModal")).show();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, form, { headers });
      } else {
        await axios.post(API_URL, form, { headers });
      }
      setForm({ titulo: "", artista: "", generos: [], videoUrl: "" });
      setEditId(null);
      fetchCanciones();
      document.getElementById("cerrarModalCancion").click();
    } catch (error) {
      console.error("Error al guardar canción:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar esta canción?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`, { headers });
      fetchCanciones();
    } catch (error) {
      console.error("Error al eliminar canción:", error);
    }
  };

  return (
    <div className="p-2">
      <h2>Gestión de Canciones</h2>
      <button
        className="btn btn-primary mb-3"
        onClick={() => handleOpenModal()}
      >
        + Crear Canción
      </button>

      {canciones.length === 0 && <p>No hay canciones registradas.</p>}
      <table className="table table-striped table-bordered">
        <thead className="thead-dark">
          <tr>
            <th>Título</th>
            <th>Artista</th>
            <th>Géneros</th>
            <th>Video</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {canciones.map((cancion) => (
            <tr key={cancion._id}>
              <td>{cancion.titulo}</td>
              <td>{cancion.artista}</td>
              <td>{cancion.generos.map((g) => g.nombre).join(", ")}</td>
              <td>
                <a href={cancion.videoUrl} target="_blank" rel="noreferrer">
                  Ver Video
                </a>
              </td>
              <td>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => handleOpenModal(cancion)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(cancion._id)}
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      <div className="modal fade" id="cancionModal" tabIndex="-1">
        <div className="modal-dialog">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">
                {editId ? "Editar Canción" : "Crear Canción"}
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                id="cerrarModalCancion"
              />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Título</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Artista</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={form.artista}
                  onChange={(e) =>
                    setForm({ ...form, artista: e.target.value })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Géneros</label>
                <select
                  multiple
                  className="form-select"
                  value={form.generos}
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    );
                    setForm({ ...form, generos: selected });
                  }}
                >
                  {generos.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Video URL</label>
                <input
                  type="url"
                  className="form-control"
                  value={form.videoUrl}
                  onChange={(e) =>
                    setForm({ ...form, videoUrl: e.target.value })
                  }
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
