import React, { useEffect, useState } from "react";
import axios from "axios";
import { dropboxUrlToRaw } from "../utils/getYoutubeThumbnail";
import ToastModal from "../components/modal/ToastModal";

const API_URL2 = import.meta.env.VITE_API_URL;
const API_URL = `${API_URL2}/song`;
const GENEROS_URL = `${API_URL2}/genero`;

export default function CancionCRUD() {
  const [canciones, setCanciones] = useState([]);
  const [generos, setGeneros] = useState([]);
  const [form, setForm] = useState({
    numero: "",
    titulo: "",
    artista: "",
    generos: "",
    videoUrl: "",
    imagenUrl: "",
    visiblePrincipal: false,
  });
  const [editId, setEditId] = useState(null);
  const [toastMensaje, setToastMensaje] = useState("");

  const headers = {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };

  const fetchCanciones = async () => {
    try {
      const res = await axios.get(`${API_URL}/numero`, { headers });
      setCanciones(res.data);
    } catch (error) {
      console.error("Error al obtener canciones:", error);
    }
  };

  const fetchGeneros = async () => {
    try {
      const res = await axios.get(GENEROS_URL, { headers });
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
        numero: cancion.numero || form.numero, // mantiene el número si es edición
        titulo: cancion.titulo,
        artista: cancion.artista,
        generos: cancion.generos?._id || "",
        videoUrl: cancion.videoUrl,
        imagenUrl: cancion.imagenUrl || "",
        visiblePrincipal: cancion.visiblePrincipal || false,
      });
    } else {
      setEditId(null);
      setForm({
        numero: form.numero, // mantiene el número ingresado
        titulo: "",
        artista: "",
        generos: "",
        videoUrl: "",
        imagenUrl: "",
        visiblePrincipal: false,
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
        numero: parseInt(form.numero),
      };

      if (editId) {
        await axios.put(`${API_URL}/${editId}`, dataToSend, { headers });
        setToastMensaje("Canción editada correctamente");
      } else {
        await axios.post(API_URL, dataToSend, { headers });
        setToastMensaje("Canción creada correctamente");
        // Limpiar todos los campos excepto el número
        setForm((prev) => ({
          ...prev,
          titulo: "",
          artista: "",
          generos: "",
          videoUrl: "",
          imagenUrl: "",
          visiblePrincipal: false,
        }));
      }

      setEditId(null);
      fetchCanciones();
      // NO cerramos el modal automáticamente
    } catch (error) {
      console.error("Error al guardar canción:", error);
    }
  };
  const handleDelete = async (id) => {
    // Mostramos un toast preguntando confirmación
    const confirmar = window.confirm(
      "⚠️ ¿Estás seguro de eliminar esta canción?"
    );
    if (!confirmar) return;

    try {
      await axios.delete(`${API_URL}/${id}`, { headers });
      setToastMensaje("🗑️ Canción eliminada correctamente");
      fetchCanciones();
    } catch (error) {
      console.error("Error al eliminar canción:", error);
      setToastMensaje("❌ Error al eliminar la canción");
    }
  };

  return (
    <div className="p-2">
      <h2>Gestión de Canciones</h2>
      <button
        className="btn btn-primary"
        style={{
          position: "fixed",
          top: "30px",
          right: "20px",
          zIndex: 9999,
        }}
        onClick={() => handleOpenModal()}
      >
        + Crear Canción
      </button>

      {canciones.length === 0 && <p>No hay canciones registradas.</p>}
      <table className="table table-striped table-bordered">
        <thead className="thead-dark">
          <tr>
            <th>#</th>
            <th>Título</th>
            <th>Artista</th>
            <th>Género</th>
            <th>Video</th>
            <th>Imagen</th>
            <th>Visible Principal</th>
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
                <a href={cancion.videoUrl} target="_blank" rel="noreferrer">
                  Ver Video
                </a>
              </td>
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
              <td>{cancion.visiblePrincipal ? "Sí" : "No"}</td>
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

                    <div className="mb-3 form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="visiblePrincipal"
                        checked={form.visiblePrincipal}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            visiblePrincipal: e.target.checked,
                          })
                        }
                      />
                      <label
                        className="form-check-label"
                        htmlFor="visiblePrincipal"
                      >
                        ¿Visible en principal?
                      </label>
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

      {/* Toast */}
      <ToastModal
        mensaje={toastMensaje}
        duracion={2000}
        onClose={() => setToastMensaje("")}
      />
    </div>
  );
}
