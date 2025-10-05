import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { FiSave, FiTrash } from "react-icons/fi";

const UsuariosCrud = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("crear"); // "crear" o "editar"
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    email: "",
    password: "AmericanKaraoke100.",
    rol: "cantante",
  });
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [errorCreate, setErrorCreate] = useState(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [filtroSuscripcion, setFiltroSuscripcion] = useState("todos");

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`);
      const usuariosConEdicion = (res.data.user || []).map((u) => ({
        ...u,
        editSuscrito: !!u.suscrito,
        editStart: u.subscriptionStart ? u.subscriptionStart.slice(0, 10) : "",
        editEnd: u.subscriptionEnd ? u.subscriptionEnd.slice(0, 10) : "",
      }));
      setUsuarios(usuariosConEdicion);
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
    }
  };

  const handleInputChange = (id, field, value) => {
    setUsuarios((prev) =>
      prev.map((u) => (u._id === id ? { ...u, [field]: value } : u))
    );
  };

  const handleUpdateUser = async (user) => {
    try {
      await axios.patch(`${API_URL}/users/${user._id}`, {
        suscrito: user.editSuscrito,
        subscriptionStart: user.editStart,
        subscriptionEnd: user.editEnd,
        rol: user.rol,
      });
      alert("Usuario actualizado");
      fetchUsuarios();
    } catch (err) {
      console.error("Error actualizando usuario:", err);
      alert("Error al actualizar");
    }
  };

  const handleDeleteUser = async (id) => {
    const confirmDelete = window.confirm("¿Eliminar usuario?");
    if (!confirmDelete) return;
    try {
      await axios.delete(`${API_URL}/user/${id}`);
      alert("Usuario eliminado");
      fetchUsuarios();
    } catch (err) {
      console.error("Error eliminando usuario:", err);
      alert("Error al eliminar usuario");
    }
  };

  const handleChangeNuevoUsuario = (e) => {
    const { name, value } = e.target;
    setNuevoUsuario((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorCreate(null);
    setLoadingCreate(true);
    try {
      await axios.post(`${API_URL}/user`, {
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        password: nuevoUsuario.password,
        rol: nuevoUsuario.rol,
      });
      alert("Usuario creado exitosamente");
      setModalVisible(false);
      setNuevoUsuario({
        nombre: "",
        email: "",
        password: "AmericanKaraoke100.",
        rol: "cantante",
      });
      fetchUsuarios();
    } catch (err) {
      console.error("Error creando usuario:", err);
      setErrorCreate(err.response?.data?.message || "Error al crear usuario.");
    } finally {
      setLoadingCreate(false);
    }
  };

  // Abrir modal para edición
  const handleEditUser = (user) => {
    setModalMode("editar");
    setUsuarioSeleccionado({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      _id: user._id,
      newPassword: "", // para actualizar si se ingresa
    });
    setModalVisible(true);
  };

  // Submit único para modal
  const handleSubmitModal = async (e) => {
    e.preventDefault();
    if (modalMode === "crear") {
      handleCreateUser(e);
    } else if (modalMode === "editar") {
      try {
        const data = {
          nombre: usuarioSeleccionado.nombre,
          email: usuarioSeleccionado.email,
          rol: usuarioSeleccionado.rol,
        };
        if (usuarioSeleccionado.newPassword) {
          data.password = usuarioSeleccionado.newPassword;
        }

        await axios.patch(`${API_URL}/users/${usuarioSeleccionado._id}`, data);

        alert("Usuario actualizado");
        setModalVisible(false);
        setUsuarioSeleccionado(null);
        fetchUsuarios();
      } catch (err) {
        console.error("Error actualizando usuario:", err);
        alert("Error al actualizar usuario");
      }
    }
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    if (filtroSuscripcion === "todos") return true;
    if (filtroSuscripcion === "suscritos") return usuario.suscrito === true;
    if (filtroSuscripcion === "noSuscritos") return usuario.suscrito === false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 justify-between">
        <button
          onClick={() => {
            setModalMode("crear");
            setModalVisible(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded"
        >
          + Crear Usuario
        </button>
      </div>

      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border">Nombre</th>
            <th className="py-2 px-4 border">Email</th>
            <th className="py-2 px-4 border">Rol</th>
            <th className="py-2 px-4 border">Acción</th>
          </tr>
        </thead>
        <tbody>
          {usuariosFiltrados.map((user) => (
            <tr key={user._id} className="text-center">
              <td className="py-2 px-4 border">{user.nombre}</td>
              <td className="py-2 px-4 border">{user.email}</td>
              <td className="py-2 px-4 border">
                <select
                  className="form-select"
                  value={user.rol}
                  onChange={(e) =>
                    handleInputChange(user._id, "rol", e.target.value)
                  }
                >
                  <option value="cantante">Cantante</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="py-2 px-4 border flex justify-center gap-2">
                <button
                  onClick={() => handleUpdateUser(user)}
                  className="bg-success text-white px-2 py-1 rounded hover:bg-blue-600"
                  title="Guardar Cambios"
                >
                  <FiSave />
                </button>
                <button
                  onClick={() => handleDeleteUser(user._id)}
                  className="bg-danger text-white px-2 py-1 rounded"
                  title="Eliminar Usuario"
                >
                  <FiTrash />
                </button>
                <button
                  onClick={() => handleEditUser(user)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                  title="Editar Usuario"
                >
                  ✏️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal Crear/Editar Usuario */}
      {modalVisible && (
        <div
          className="modal show fade d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setModalVisible(false)}
        >
          <div
            className="modal-dialog"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modalMode === "crear" ? "Crear Usuario" : "Editar Usuario"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalVisible(false)}
                ></button>
              </div>
              <div className="modal-body">
                {errorCreate && (
                  <div className="alert alert-danger">{errorCreate}</div>
                )}
                <form onSubmit={handleSubmitModal}>
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      name="nombre"
                      value={
                        modalMode === "editar"
                          ? usuarioSeleccionado.nombre
                          : nuevoUsuario.nombre
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        modalMode === "editar"
                          ? setUsuarioSeleccionado((prev) => ({
                              ...prev,
                              nombre: value,
                            }))
                          : handleChangeNuevoUsuario(e);
                      }}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={
                        modalMode === "editar"
                          ? usuarioSeleccionado.email
                          : nuevoUsuario.email
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        modalMode === "editar"
                          ? setUsuarioSeleccionado((prev) => ({
                              ...prev,
                              email: value,
                            }))
                          : handleChangeNuevoUsuario(e);
                      }}
                      required
                    />
                  </div>

                  {/* Nueva contraseña opcional */}
                  {modalMode === "editar" && (
                    <div className="mb-3">
                      <label className="form-label">Nueva Contraseña</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Dejar vacío para no cambiar"
                        value={usuarioSeleccionado.newPassword}
                        onChange={(e) =>
                          setUsuarioSeleccionado((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}

                  {modalMode === "crear" && (
                    <div className="mb-3">
                      <label className="form-label">Contraseña</label>
                      <input
                        type="text"
                        className="form-control"
                        value={nuevoUsuario.password}
                        readOnly
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Rol</label>
                    <select
                      className="form-select"
                      name="rol"
                      value={
                        modalMode === "editar"
                          ? usuarioSeleccionado.rol
                          : nuevoUsuario.rol
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        modalMode === "editar"
                          ? setUsuarioSeleccionado((prev) => ({
                              ...prev,
                              rol: value,
                            }))
                          : handleChangeNuevoUsuario(e);
                      }}
                    >
                      <option value="cantante">Cantante</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setModalVisible(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loadingCreate}
                    >
                      {modalMode === "crear"
                        ? loadingCreate
                          ? "Creando..."
                          : "Crear"
                        : "Guardar Cambios"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosCrud;
