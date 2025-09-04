import React, { useEffect, useState } from "react";
import axios from "axios";
import ReactPlayer from "react-player";
import { API_URL } from "../config";

const API_PUBLICACION = `${API_URL}/publicacion`;

// Lista de botones con valor real y nombre visible
const listaBotones = [
  { value: "boton1", label: "Celeste" },
  { value: "boton2", label: "Rojo" },
  { value: "boton3", label: "Verde" },
  { value: "boton4", label: "Rosado" },
  { value: "boton5", label: "Cafe" },
  { value: "boton6", label: "Verde" },
  { value: "boton7", label: "Morado" },
  { value: "boton8", label: "Gris" },
  { value: "boton9", label: "Azul" },
  { value: "boton10", label: "Rojo Oscuro" },
];

const PublicacionesCrud = () => {
  const [publicaciones, setPublicaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editarId, setEditarId] = useState(null);
  const [formData, setFormData] = useState({
    titulo: "",
    boton: "",
    mediaUrl: "",
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
        boton: pub.boton || "",
        mediaUrl: pub.mediaUrl || "",
      });
    } else {
      setEditarId(null);
      setFormData({
        titulo: "",
        boton: "",
        mediaUrl: "",
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
    const { titulo } = formData;
    if (!titulo) {
      setError("El título es obligatorio");
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
        <button className="btn btn-primary mb-3" onClick={() => abrirModal()}>
          Nueva Publicación
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {cargando && <p>Cargando...</p>}

      <table className="table table-bordered table-striped table-hover">
        <thead className="table-dark">
          <tr>
            <th>Título</th>
            <th>Botón</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {publicaciones.length === 0 ? (
            <tr>
              <td colSpan="3" className="text-center">
                No hay publicaciones
              </td>
            </tr>
          ) : (
            publicaciones.map((pub) => (
              <tr key={pub._id}>
                <td>{pub.titulo}</td>
                <td>
                  {pub.boton && (
                    <button className={pub.boton}></button>
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
                  <label className="form-label">Botón</label>
                  <select
                    className="form-select"
                    name="boton"
                    value={formData.boton}
                    onChange={manejarCambio}
                  >
                    <option value="">-- Selecciona un color --</option>
                    {listaBotones.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
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
