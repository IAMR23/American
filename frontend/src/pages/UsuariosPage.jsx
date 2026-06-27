import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import {
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiTrash,
  FiX,
} from "react-icons/fi";
import { confirmAction, showError, showSuccess } from "../utils/swalAlerts";
import "./UsuariosPage.css";

const DEFAULT_PASSWORD = "AmericanKaraoke100.";

const emptyForm = {
  nombre: "",
  email: "",
  password: DEFAULT_PASSWORD,
  rol: "cantante",
  suscrito: false,
  subscriptionStart: "",
  subscriptionEnd: "",
};

const toDatetimeLocal = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const fromDatetimeLocal = (value) => (value ? new Date(value).toISOString() : null);

const getSubscriptionState = (user) => {
  if (!user.suscrito) return "Sin suscripcion";
  if (!user.subscriptionEnd) return "Activa";

  return new Date(user.subscriptionEnd) > new Date() ? "Activa" : "Vencida";
};

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("crear");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errorCreate, setErrorCreate] = useState(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [filtroSuscripcion, setFiltroSuscripcion] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const normalizeUser = (user) => ({
    ...user,
    editSuscrito: !!user.suscrito,
    editStart: toDatetimeLocal(user.subscriptionStart),
    editEnd: toDatetimeLocal(user.subscriptionEnd),
    editRol: user.rol || "cantante",
  });

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/users`);
      setUsuarios((res.data.user || []).map(normalizeUser));
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
      showError("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = usuarios.length;
    const activos = usuarios.filter(
      (user) =>
        user.suscrito &&
        user.subscriptionEnd &&
        new Date(user.subscriptionEnd) > new Date(),
    ).length;
    const vencidos = usuarios.filter(
      (user) =>
        user.suscrito &&
        user.subscriptionEnd &&
        new Date(user.subscriptionEnd) <= new Date(),
    ).length;
    const admins = usuarios.filter((user) => user.rol === "admin").length;

    return { total, activos, vencidos, admins };
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const estado = getSubscriptionState(usuario);
      const coincideFiltro =
        filtroSuscripcion === "todos" ||
        (filtroSuscripcion === "suscritos" && estado === "Activa") ||
        (filtroSuscripcion === "vencidos" && estado === "Vencida") ||
        (filtroSuscripcion === "noSuscritos" && !usuario.suscrito);

      const coincideBusqueda =
        !texto ||
        usuario.nombre?.toLowerCase().includes(texto) ||
        usuario.email?.toLowerCase().includes(texto) ||
        usuario.rol?.toLowerCase().includes(texto);

      return coincideFiltro && coincideBusqueda;
    });
  }, [busqueda, filtroSuscripcion, usuarios]);

  const handleInputChange = (id, field, value) => {
    setUsuarios((prev) =>
      prev.map((user) => (user._id === id ? { ...user, [field]: value } : user)),
    );
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreateModal = () => {
    setModalMode("crear");
    setSelectedId(null);
    setErrorCreate(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (user) => {
    setModalMode("editar");
    setSelectedId(user._id);
    setErrorCreate(null);
    setForm({
      nombre: user.nombre || "",
      email: user.email || "",
      password: "",
      rol: user.rol || "cantante",
      suscrito: !!user.suscrito,
      subscriptionStart: toDatetimeLocal(user.subscriptionStart),
      subscriptionEnd: toDatetimeLocal(user.subscriptionEnd),
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedId(null);
    setErrorCreate(null);
    setForm(emptyForm);
  };

  const buildUserPayload = ({ includePassword = false } = {}) => {
    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      rol: form.rol,
      suscrito: Boolean(form.suscrito),
      subscriptionStart: fromDatetimeLocal(form.subscriptionStart),
      subscriptionEnd: fromDatetimeLocal(form.subscriptionEnd),
    };

    if (includePassword || form.password.trim()) {
      payload.password = form.password.trim();
    }

    return payload;
  };

  const handleSubmitModal = async (event) => {
    event.preventDefault();
    setErrorCreate(null);
    setLoadingCreate(true);

    try {
      if (modalMode === "crear") {
        await axios.post(`${API_URL}/user`, buildUserPayload({ includePassword: true }));
        showSuccess("Usuario creado exitosamente");
      } else {
        await axios.patch(`${API_URL}/users/${selectedId}`, buildUserPayload());
        showSuccess("Usuario actualizado");
      }

      closeModal();
      fetchUsuarios();
    } catch (err) {
      console.error("Error guardando usuario:", err);
      setErrorCreate(err.response?.data?.message || "Error al guardar usuario.");
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleUpdateInline = async (user) => {
    setSavingId(user._id);
    try {
      await axios.patch(`${API_URL}/users/${user._id}`, {
        suscrito: Boolean(user.editSuscrito),
        subscriptionStart: fromDatetimeLocal(user.editStart),
        subscriptionEnd: fromDatetimeLocal(user.editEnd),
        rol: user.editRol,
      });
      showSuccess("Usuario guardado");
      fetchUsuarios();
    } catch (err) {
      console.error("Error actualizando usuario:", err);
      showError("Error al actualizar");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = async (id) => {
    const confirmDelete = await confirmAction({
      title: "Eliminar usuario",
      text: "Eliminar usuario?",
      confirmButtonText: "Si, eliminar",
    });

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/user/${id}`);
      showSuccess("Usuario eliminado");
      fetchUsuarios();
    } catch (err) {
      console.error("Error eliminando usuario:", err);
      showError("Error al eliminar usuario");
    }
  };

  return (
    <div className="users-admin">
      <div className="users-admin__header">
        <div>
          <p className="users-admin__eyebrow">Dashboard</p>
          <h2>Usuarios</h2>
          <span>Gestiona cuentas, roles y suscripciones desde un solo modulo.</span>
        </div>

        <button className="users-admin__primary" onClick={openCreateModal}>
          <FiPlus />
          Crear usuario
        </button>
      </div>

      <div className="users-admin__stats">
        <div>
          <span>Total</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>Suscripciones activas</span>
          <strong>{stats.activos}</strong>
        </div>
        <div>
          <span>Vencidas</span>
          <strong>{stats.vencidos}</strong>
        </div>
        <div>
          <span>Admins</span>
          <strong>{stats.admins}</strong>
        </div>
      </div>

      <div className="users-admin__toolbar">
        <label className="users-admin__search">
          <FiSearch />
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre, email o rol"
          />
        </label>

        <select
          value={filtroSuscripcion}
          onChange={(event) => setFiltroSuscripcion(event.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="suscritos">Suscritos activos</option>
          <option value="vencidos">Vencidos</option>
          <option value="noSuscritos">No suscritos</option>
        </select>

        <button className="users-admin__ghost" onClick={fetchUsuarios}>
          <FiRefreshCw />
          Actualizar
        </button>
      </div>

      <div className="users-admin__tableShell">
        <table className="users-admin__table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="users-admin__empty">
                  Cargando usuarios...
                </td>
              </tr>
            ) : usuariosFiltrados.length ? (
              usuariosFiltrados.map((user) => {
                const estado = getSubscriptionState(user);

                return (
                  <tr key={user._id}>
                    <td>
                      <div className="users-admin__identity">
                        <strong>{user.nombre}</strong>
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <select
                        value={user.editRol}
                        onChange={(event) =>
                          handleInputChange(user._id, "editRol", event.target.value)
                        }
                      >
                        <option value="cantante">Cantante</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <label className="users-admin__switch">
                        <input
                          type="checkbox"
                          checked={user.editSuscrito}
                          onChange={(event) =>
                            handleInputChange(
                              user._id,
                              "editSuscrito",
                              event.target.checked,
                            )
                          }
                        />
                        <span>{estado}</span>
                      </label>
                    </td>
                    <td>
                      <input
                        type="datetime-local"
                        value={user.editStart}
                        onChange={(event) =>
                          handleInputChange(user._id, "editStart", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="datetime-local"
                        value={user.editEnd}
                        onChange={(event) =>
                          handleInputChange(user._id, "editEnd", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <div className="users-admin__actions">
                        <button
                          className="users-admin__iconButton users-admin__iconButton--save"
                          onClick={() => handleUpdateInline(user)}
                          disabled={savingId === user._id}
                          title="Guardar suscripcion"
                        >
                          <FiSave />
                        </button>
                        <button
                          className="users-admin__iconButton"
                          onClick={() => openEditModal(user)}
                          title="Editar usuario"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="users-admin__iconButton users-admin__iconButton--danger"
                          onClick={() => handleDeleteUser(user._id)}
                          title="Eliminar usuario"
                        >
                          <FiTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="users-admin__empty">
                  No hay usuarios para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalVisible && (
        <div className="users-admin__modalBackdrop" onClick={closeModal}>
          <form
            className="users-admin__modal"
            onSubmit={handleSubmitModal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="users-admin__modalHeader">
              <div>
                <span>{modalMode === "crear" ? "Nuevo registro" : "Edicion"}</span>
                <h3>{modalMode === "crear" ? "Crear usuario" : "Editar usuario"}</h3>
              </div>
              <button type="button" onClick={closeModal}>
                <FiX />
              </button>
            </div>

            {errorCreate && <div className="users-admin__error">{errorCreate}</div>}

            <div className="users-admin__formGrid">
              <label>
                Nombre
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(event) => handleFormChange("nombre", event.target.value)}
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleFormChange("email", event.target.value)}
                  required
                />
              </label>

              <label>
                {modalMode === "crear" ? "Contrasena" : "Nueva contrasena"}
                <input
                  type={modalMode === "crear" ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => handleFormChange("password", event.target.value)}
                  placeholder={
                    modalMode === "crear" ? DEFAULT_PASSWORD : "Dejar vacio para no cambiar"
                  }
                  required={modalMode === "crear"}
                />
              </label>

              <label>
                Rol
                <select
                  value={form.rol}
                  onChange={(event) => handleFormChange("rol", event.target.value)}
                >
                  <option value="cantante">Cantante</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <label className="users-admin__check">
                <input
                  type="checkbox"
                  checked={form.suscrito}
                  onChange={(event) => handleFormChange("suscrito", event.target.checked)}
                />
                Usuario suscrito
              </label>

              <label>
                Fecha inicio
                <input
                  type="datetime-local"
                  value={form.subscriptionStart}
                  onChange={(event) =>
                    handleFormChange("subscriptionStart", event.target.value)
                  }
                />
              </label>

              <label>
                Fecha fin
                <input
                  type="datetime-local"
                  value={form.subscriptionEnd}
                  onChange={(event) =>
                    handleFormChange("subscriptionEnd", event.target.value)
                  }
                />
              </label>
            </div>

            <div className="users-admin__modalFooter">
              <button type="button" className="users-admin__ghost" onClick={closeModal}>
                Cancelar
              </button>
              <button
                type="submit"
                className="users-admin__primary"
                disabled={loadingCreate}
              >
                {loadingCreate
                  ? "Guardando..."
                  : modalMode === "crear"
                    ? "Crear usuario"
                    : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UsuariosPage;
