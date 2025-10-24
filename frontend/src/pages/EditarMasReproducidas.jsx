import React, { useEffect, useState } from "react";
import axios from "axios";
import { dropboxUrlToRaw } from "../utils/getYoutubeThumbnail";

const API_URL = import.meta.env.VITE_API_URL;

//const GENEROS_URL = `${API_URL2}/genero`;

export default function EditarMasReproducidas() {
  const [canciones, setCanciones] = useState([]);
  const [generos, setGeneros] = useState([]);
  const [form, setForm] = useState({
    numero: "",
    titulo: "",
    artista: "",
    generos: "",
    videoUrl: "",
    imagenUrl: "",
  });
  const [editId, setEditId] = useState(null);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };

  const fetchCanciones = async () => {
    try {
      const res = await axios.get(`${API_URL}/song/masreproducidas`, {
        headers,
      });
      console.log(res.data);
      setCanciones(res.data);
    } catch (error) {
      console.error("Error al obtener canciones:", error);
    }
  };

  const fetchGeneros = async () => {
    try {
      const res = await axios.get(`${API_URL}/genero`, { headers });
      setGeneros(res.data.genero || []);
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
        numero: cancion.numero || "",
        titulo: cancion.titulo,
        artista: cancion.artista,
        generos: cancion.generos?._id || "",
        videoUrl: cancion.videoUrl,
        imagenUrl: cancion.imagenUrl || "",
      });
    } else {
      setEditId(null);
      setForm({
        numero: "",
        titulo: "",
        artista: "",
        generos: "",
        videoUrl: "",
        imagenUrl: "",
      });
    }
    new window.bootstrap.Modal(document.getElementById("cancionModal")).show();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { numero, titulo, artista, generos, videoUrl, imagenUrl } = form;

    if (
      !numero ||
      !titulo.trim() ||
      !artista.trim() ||
      !generos ||
      !videoUrl.trim()
    ) {
      alert("Por favor, complete todos los campos obligatorios.");
      return;
    }

    try {
      const dataToSend = {
        ...form,
        numero: parseInt(form.numero), // aseguramos que sea número
      };

      if (editId) {
        await axios.put(`${API_URL}/song/${editId}`, dataToSend, { headers });
      } else {
        await axios.post(API_URL, dataToSend, { headers });
      }

      setForm({
        numero: "",
        titulo: "",
        artista: "",
        generos: "",
        videoUrl: "",
        imagenUrl: "",
      });
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
      await axios.delete(`${API_URL}/song/${id}`, { headers });
      fetchCanciones();
    } catch (error) {
      console.error("Error al eliminar canción:", error);
    }
  };

  return (
    <div className="p-2">
      <h2>Canciones mas cantadas</h2>

      {canciones.length === 0 && <p>No hay canciones registradas.</p>}
      <table className="table table-striped table-bordered">
        <thead className="thead-dark">
          <tr>
            <th>#</th>
            <th>Título</th>
            <th>Artista</th>
            <th>Género</th>
            <th>Imagen</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {canciones.map((cancion) => (
            <tr key={cancion._id}>
              <td>{cancion.numero}</td>
              <td>{cancion.titulo}</td>
              <td>{cancion.artista}</td>
              <td>{cancion.generos?.nombre || "Sin género"}</td>
              <td>
                {cancion.imagenUrl ? (
                  <img
                    src={dropboxUrlToRaw(cancion.imagenUrl) || null}
                    alt={cancion.titulo}
                    style={{ width: "60px", height: "auto" }}
                  />
                ) : (
                  "Sin imagen"
                )}
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
        <div className="modal-dialog" style={{ maxWidth: "60vw" }}>
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
              <div className="container-fluid">
                <div className="row">
                  {/* Columna izquierda */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Número</label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        value={form.numero}
                        onChange={(e) =>
                          setForm({ ...form, numero: e.target.value })
                        }
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
                      <label className="form-label">Canción</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.titulo}
                        onChange={(e) =>
                          setForm({ ...form, titulo: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Columna derecha */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Género</label>
                      <select
                        className="form-select"
                        required
                        value={form.generos}
                        onChange={(e) =>
                          setForm({ ...form, generos: e.target.value })
                        }
                      >
                        <option value="">Seleccionar género</option>
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
                        required
                        value={form.videoUrl}
                        onChange={(e) =>
                          setForm({ ...form, videoUrl: e.target.value })
                        }
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Imagen URL</label>
                      <input
                        type="url"
                        className="form-control"
                        value={form.imagenUrl}
                        onChange={(e) =>
                          setForm({ ...form, imagenUrl: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
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
