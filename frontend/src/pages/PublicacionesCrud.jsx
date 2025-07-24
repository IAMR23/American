import React, { useEffect, useState } from "react";
import axios from "axios";
import ReactPlayer from "react-player";
import { API_URL } from "../config"

const API_PUBLICACION = `${API_URL}/publicacion`;

const PublicacionesCrud = () => {
  const [publicaciones, setPublicaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editarId, setEditarId] = useState(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    tipo: "",
    mediaUrl: "",
    tipoMedia: "",
  });

  useEffect(() => {
    cargarPublicaciones();
  }, []);

  const cargarPublicaciones = async () => {
    try {
      setCargando(true);
      const res = await axios.get(API_PUBLICACION);
      setPublicaciones(res.data);
      setError(null);
    } catch {
      setError("Error al cargar publicaciones");
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (pub = null) => {
    if (pub) {
      setEditarId(pub._id);
      setFormData({
        titulo: pub.titulo,
        descripcion: pub.descripcion,
        tipo: pub.tipo,
        mediaUrl: pub.mediaUrl || "",
        tipoMedia: pub.tipoMedia || "",
      });
    } else {
      setEditarId(null);
      setFormData({
        titulo: "",
        descripcion: "",
        tipo: "",
        mediaUrl: "",
        tipoMedia: "",
      });
    }
    setModalVisible(true);
    setError(null);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setError(null);
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const guardarPublicacion = async () => {
    const { titulo, descripcion, tipo } = formData;
    if (!titulo || !descripcion || !tipo) {
      setError("Por favor completa los campos obligatorios");
      return;
    }

    try {
      setCargando(true);
      if (editarId) {
        await axios.put(`${API_PUBLICACION}/${editarId}`, formData);
      } else {
        await axios.post(API_PUBLICACION, formData);
      }
      cerrarModal();
      cargarPublicaciones();
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar");
    } finally {
      setCargando(false);
    }
  };

  const eliminarPublicacion = async (id) => {
    if (!window.confirm("¿Eliminar publicación?")) return;
    try {
      await axios.delete(`${API_PUBLICACION}/${id}`);
      cargarPublicaciones();
    } catch {
      setError("Error al eliminar");
    }
  };

  return (
    <div className="my-2">
      <h2>Publicaciones</h2>

      <div className="text-end">
        
        <button className="btn btn-primary mb-3 " onClick={() => abrirModal()}>
          Nueva Publicación
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {cargando && <p>Cargando...</p>}

      <table className="table table-bordered table-striped table-hover">
        <thead className="table-dark">
          <tr>
            <th>Título</th>
            <th>Descripción</th>
            <th>Tipo</th>
            <th>Media</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {publicaciones.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center">
                No hay publicaciones
              </td>
            </tr>
          ) : (
            publicaciones.map((pub) => (
              <tr key={pub._id}>
                <td>{pub.titulo}</td>
                <td>{pub.descripcion}</td>
                <td>{pub.tipo}</td>
                <td style={{ maxWidth: "250px" }}>
                  {pub.mediaUrl && pub.tipoMedia === "imagen" && (
                    <img
                      src={pub.mediaUrl}
                      alt="Imagen"
                      className="img-fluid rounded"
                      style={{ maxHeight: "150px" }}
                    />
                  )}
                  {pub.mediaUrl && pub.tipoMedia === "video" && (
                    <ReactPlayer
                      url={pub.mediaUrl}
                      controls
                      width="100%"
                      height="150px"
                    />
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-warning btn-sm me-2"
                    onClick={() => abrirModal(pub)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => eliminarPublicacion(pub._id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal */}
      {modalVisible && (
        <div
          className="modal show fade d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={cerrarModal}
        >
          <div
            className="modal-dialog"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editarId ? "Editar" : "Nueva"} Publicación
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarModal}
                ></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="mb-3">
                  <label className="form-label">Título *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="titulo"
                    value={formData.titulo}
                    onChange={manejarCambio}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Descripción *</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={manejarCambio}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Tipo *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="tipo"
                    value={formData.tipo}
                    onChange={manejarCambio}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">URL Media (opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    name="mediaUrl"
                    value={formData.mediaUrl}
                    onChange={manejarCambio}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Tipo de Media</label>
                  <select
                    className="form-select"
                    name="tipoMedia"
                    value={formData.tipoMedia}
                    onChange={manejarCambio}
                  >
                    <option value="">-- Selecciona --</option>
                    <option value="video">Video Musical</option>
                    <option value="pdf">Libros y Revistas</option>
                    <option value="mp3">Radio Novelas</option>
                  </select>
                </div>

                {formData.mediaUrl && formData.tipoMedia === "imagen" && (
                  <div className="text-center">
                    <img
                      src={formData.mediaUrl}
                      alt="preview"
                      className="img-fluid rounded"
                      style={{ maxHeight: "150px" }}
                    />
                  </div>
                )}

                {formData.mediaUrl && formData.tipoMedia === "video" && (
                  <div className="text-center mt-2">
                    <ReactPlayer
                      url={formData.mediaUrl}
                      controls
                      width="100%"
                      height="200px"
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={guardarPublicacion}
                >
                  {editarId ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicacionesCrud;
