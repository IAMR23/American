import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { FiSave, FiTrash } from "react-icons/fi";

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [filtroSuscripcion, setFiltroSuscripcion] = useState("todos");

  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errorCreate, setErrorCreate] = useState(null);
  const [loadingCreate, setLoadingCreate] = useState(false);

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
      });
      alert("Usuario actualizado");
      fetchUsuarios();
    } catch (err) {
      console.error("Error actualizando usuario:", err);
      alert("Error al actualizar");
    }
  };

  // Función para eliminar usuario
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

    nuevoUsuario.password = "AmericanKaraoke100.";
    setLoadingCreate(true);
    try {
      await axios.post(`${API_URL}/user`, {
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        password: nuevoUsuario.password,
      });
      alert("Usuario creado exitosamente");
      setModalVisible(false);
      setNuevoUsuario({
        nombre: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      fetchUsuarios();
    } catch (err) {
      console.error("Error creando usuario:", err);
      setErrorCreate(err.response?.data?.message || "Error al crear usuario.");
    } finally {
      setLoadingCreate(false);
    }
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    if (filtroSuscripcion === "todos") return true;
    if (filtroSuscripcion === "suscritos") return usuario.suscrito === true;
    if (filtroSuscripcion === "noSuscritos") return usuario.suscrito === false;
    return true;
  });

  const hoy = new Date().toISOString().split("T")[0];

  return (
    <div>
      <h2 className="font-bold mb-4">Lista de Usuarios</h2>

      <div className="mb-4 flex items-center gap-4 justify-between">
        <div>
          <label className="mr-2 font-medium">Filtrar por suscripción:</label>
          <select
            value={filtroSuscripcion}
            onChange={(e) => setFiltroSuscripcion(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="todos">Todos</option>
            <option value="suscritos">Suscritos</option>
            <option value="noSuscritos">No Suscritos</option>
          </select>
        </div>
        <button
          onClick={() => setModalVisible(true)}
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
            <th className="py-2 px-4 border">Activar</th>
            <th className="py-2 px-4 border">Inicio</th>
            <th className="py-2 px-4 border">Fin</th>
            <th className="py-2 px-4 border">Acción</th>
          </tr>
        </thead>
        <tbody>
          {usuariosFiltrados.map((user) => (
            <tr key={user._id} className="text-center">
              <td className="py-2 px-4 border">{user.nombre}</td>
              <td className="py-2 px-4 border">{user.email}</td>
              <td className="py-2 px-4 border">{user.rol}</td>
              <td className="py-2 px-4 border">
                <input
                  type="checkbox"
                  checked={user.editSuscrito}
                  onChange={(e) =>
                    handleInputChange(
                      user._id,
                      "editSuscrito",
                      e.target.checked
                    )
                  }
                />
              </td>
              <td className="py-2 px-4 border">
                <input
                  type="date"
                  min={hoy}
                  value={user.editStart}
                  onChange={(e) =>
                    handleInputChange(user._id, "editStart", e.target.value)
                  }
                  className="border rounded px-2"
                />
              </td>
              <td className="py-2 px-4 border">
                <input
                  type="date"
                  min={hoy}
                  value={user.editEnd}
                  onChange={(e) =>
                    handleInputChange(user._id, "editEnd", e.target.value)
                  }
                  className="border rounded px-2"
                />
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
                  className="bg-danger text-white px-2 py-1 rounded "
                  title="Eliminar Usuario"
                >
                  <FiTrash/>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal Crear Usuario */}
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
                <h5 className="modal-title">Crear Usuario</h5>
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
                <form onSubmit={handleCreateUser}>
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      name="nombre"
                      value={nuevoUsuario.nombre}
                      onChange={handleChangeNuevoUsuario}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={nuevoUsuario.email}
                      onChange={handleChangeNuevoUsuario}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Contraseña</label>
                    <input
                      type="text"
                      className="form-control"
                      name="confirmPassword"
                      value="AmericanKaraoke100."
                      readOnly
                    />
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
                      {loadingCreate ? "Creando..." : "Crear"}
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

export default UsuariosPage;
