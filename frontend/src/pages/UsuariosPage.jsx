import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiEye,
  FiRefreshCw,
  FiSearch,
  FiTrash,
  FiUserPlus,
} from "react-icons/fi";
import { showError, showSuccess } from "../utils/swalAlerts";
import { getToken, getUserId } from "../utils/auth";
import "./UsuariosPage.css";

const DEFAULT_PASSWORD = "123456";
const PASSWORD_MIN_LENGTH = 6;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const SUBSCRIPTION_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "activa", label: "Activa" },
  { value: "vencida", label: "Vencida" },
  { value: "programada", label: "Programada" },
  { value: "sin", label: "Sin suscripcion" },
];
const ROLE_FILTERS = [
  { value: "todos", label: "Todos los roles" },
  { value: "admin", label: "Admin" },
  { value: "cantante", label: "Cantante" },
];

const emptyCreateForm = {
  nombre: "",
  email: "",
  password: DEFAULT_PASSWORD,
  confirmPassword: DEFAULT_PASSWORD,
  rol: "cantante",
  assignSubscription: false,
  subscriptionStart: "",
  subscriptionEnd: "",
};

const initialStats = {
  total: 0,
  activos: 0,
  programadas: 0,
  vencidos: 0,
  sinSuscripcion: 0,
  admins: 0,
};

const initialPagination = {
  page: 1,
  limit: PAGE_SIZE_OPTIONS[1],
  total: 0,
  totalPages: 0,
};

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const toDatetimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const fromDatetimeLocal = (value) => (value ? new Date(value).toISOString() : null);

const formatDate = (value) => {
  if (!value) return "No asignada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No asignada";

  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const daysBetween = (from, to) => {
  const diff = to.getTime() - from.getTime();
  return Math.ceil(Math.abs(diff) / 86400000);
};

const getSubscriptionStatus = (user) => {
  const now = new Date();
  const start = user.subscriptionStart ? new Date(user.subscriptionStart) : null;
  const end = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;

  if (!user.suscrito || !start || !end) {
    return { key: "sin", label: "Sin suscripcion", className: "secondary" };
  }

  if (start > now) {
    return { key: "programada", label: "Programada", className: "info" };
  }

  if (end <= now) {
    return { key: "vencida", label: "Vencida", className: "danger" };
  }

  return { key: "activa", label: "Activa", className: "success" };
};

const getPeriodHint = (user) => {
  const status = getSubscriptionStatus(user);
  const now = new Date();
  const end = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;

  if (status.key === "activa" && end) {
    return `${daysBetween(now, end)} dias restantes`;
  }

  if (status.key === "vencida" && end) {
    return `Vencio hace ${daysBetween(now, end)} dias`;
  }

  if (status.key === "programada" && user.subscriptionStart) {
    return `Inicia en ${daysBetween(now, new Date(user.subscriptionStart))} dias`;
  }

  return "No asignada";
};

const getPageItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) items.push("start-ellipsis");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push("end-ellipsis");
  items.push(totalPages);
  return items;
};

const validateBaseUser = (form, { creating = false } = {}) => {
  const errors = {};

  if (!form.nombre.trim()) errors.nombre = "El nombre es obligatorio.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Ingresa un correo valido.";
  }

  if (creating) {
    if (!form.password) errors.password = "La contrasena es obligatoria.";
    if (form.password && form.password.length < PASSWORD_MIN_LENGTH) {
      errors.password = "Debe tener minimo 6 caracteres.";
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Las contrasenas no coinciden.";
    }
  }

  if (!["admin", "cantante"].includes(form.rol)) {
    errors.rol = "Selecciona un rol valido.";
  }

  if (form.assignSubscription) {
    if (!form.subscriptionStart) errors.subscriptionStart = "La fecha inicial es obligatoria.";
    if (!form.subscriptionEnd) errors.subscriptionEnd = "La fecha final es obligatoria.";
    if (
      form.subscriptionStart &&
      form.subscriptionEnd &&
      new Date(form.subscriptionEnd) <= new Date(form.subscriptionStart)
    ) {
      errors.subscriptionEnd = "La fecha final debe ser posterior a la inicial.";
    }
  }

  return errors;
};

function Modal({ title, subtitle, children, footer, onClose, size = "lg" }) {
  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className={`modal-dialog modal-dialog-centered modal-${size}`}>
          <div className="modal-content shadow">
            <div className="modal-header">
              <div>
                {subtitle && <div className="text-muted small text-uppercase">{subtitle}</div>}
                <h5 className="modal-title">{title}</h5>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

export default function UsuariosPage() {
  const currentUserId = getUserId();
  const [usuarios, setUsuarios] = useState([]);
  const [stats, setStats] = useState(initialStats);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [subscriptionFilter, setSubscriptionFilter] = useState("todos");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[1]);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [modal, setModal] = useState({ type: null, user: null });
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editForm, setEditForm] = useState(null);
  const [subscriptionForm, setSubscriptionForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get(`${API_URL}/users`, {
        headers: authHeaders(),
        params: {
          page,
          limit,
          search: debouncedSearch || undefined,
          role: roleFilter,
          subscriptionStatus: subscriptionFilter,
          sortBy,
          sortOrder,
        },
      });

      setUsuarios(res.data.user || []);
      setStats(res.data.stats || initialStats);
      setPagination(res.data.pagination || initialPagination);

      if (res.data.pagination?.page && res.data.pagination.page !== page) {
        setPage(res.data.pagination.page);
      }
    } catch (err) {
      const message = err.response?.data?.message || "Error al consultar usuarios.";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, limit, page, roleFilter, sortBy, sortOrder, subscriptionFilter]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const pageItems = useMemo(
    () => getPageItems(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages],
  );
  const firstVisibleItem = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const lastVisibleItem = pagination.total
    ? Math.min(pagination.page * pagination.limit, pagination.total)
    : 0;
  const hasFilters =
    Boolean(searchInput) || roleFilter !== "todos" || subscriptionFilter !== "todos";

  const resetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setRoleFilter("todos");
    setSubscriptionFilter("todos");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const changeSubscriptionFilter = (value) => {
    setSubscriptionFilter(value);
    setPage(1);
  };

  const changeRoleFilter = (value) => {
    setRoleFilter(value);
    setPage(1);
  };

  const changeLimit = (value) => {
    setLimit(Number(value));
    setPage(1);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const closeModal = () => {
    setModal({ type: null, user: null });
    setCreateForm(emptyCreateForm);
    setEditForm(null);
    setSubscriptionForm(null);
    setFormErrors({});
  };

  const openCreateModal = () => {
    setCreateForm(emptyCreateForm);
    setFormErrors({});
    setModal({ type: "create", user: null });
  };

  const openEditModal = (user) => {
    setEditForm({
      nombre: user.nombre || "",
      email: user.email || "",
      rol: user.rol || "cantante",
    });
    setFormErrors({});
    setModal({ type: "edit", user });
  };

  const openSubscriptionModal = (user) => {
    const status = getSubscriptionStatus(user);
    const now = new Date();
    const baseStart =
      status.key === "activa" && user.subscriptionEnd
        ? new Date(user.subscriptionEnd)
        : now;
    const baseEnd = new Date(baseStart);
    baseEnd.setDate(baseEnd.getDate() + 30);

    setSubscriptionForm({
      action: user.suscrito ? "editar" : "asignar",
      subscriptionStart: toDatetimeLocal(user.subscriptionStart) || toDatetimeLocal(baseStart),
      subscriptionEnd: toDatetimeLocal(user.subscriptionEnd) || toDatetimeLocal(baseEnd),
      renewDays: 30,
    });
    setFormErrors({});
    setModal({ type: "subscription", user });
  };

  const subscriptionPreview = useMemo(() => {
    if (!subscriptionForm || !modal.user) return null;
    if (subscriptionForm.action === "quitar") return null;

    if (subscriptionForm.action === "renovar") {
      const status = getSubscriptionStatus(modal.user);
      const start =
        status.key === "activa" && modal.user.subscriptionEnd
          ? new Date(modal.user.subscriptionEnd)
          : subscriptionForm.subscriptionStart
            ? new Date(subscriptionForm.subscriptionStart)
            : new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + Number(subscriptionForm.renewDays || 0));
      return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
    }

    return {
      start: subscriptionForm.subscriptionStart,
      end: subscriptionForm.subscriptionEnd,
    };
  }, [modal.user, subscriptionForm]);

  const updateCreateField = (field, value) => {
    const next = { ...createForm, [field]: value };
    setCreateForm(next);
    setFormErrors(validateBaseUser(next, { creating: true }));
  };

  const updateEditField = (field, value) => {
    const next = { ...editForm, [field]: value };
    setEditForm(next);
    setFormErrors(validateBaseUser({ ...next, assignSubscription: false }));
  };

  const validateSubscriptionForm = () => {
    if (subscriptionForm.action === "quitar") return {};

    const start = subscriptionPreview?.start;
    const end = subscriptionPreview?.end;
    const errors = {};

    if (!start) errors.subscriptionStart = "La fecha inicial es obligatoria.";
    if (!end) errors.subscriptionEnd = "La fecha final es obligatoria.";
    if (start && end && new Date(end) <= new Date(start)) {
      errors.subscriptionEnd = "La fecha final debe ser posterior a la inicial.";
    }
    if (subscriptionForm.action === "renovar" && Number(subscriptionForm.renewDays) <= 0) {
      errors.renewDays = "Los dias deben ser mayores a cero.";
    }

    return errors;
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    const errors = validateBaseUser(createForm, { creating: true });
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/user`,
        {
          nombre: createForm.nombre.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          rol: createForm.rol,
          suscrito: createForm.assignSubscription,
          subscriptionStart: fromDatetimeLocal(createForm.subscriptionStart),
          subscriptionEnd: fromDatetimeLocal(createForm.subscriptionEnd),
        },
        { headers: authHeaders() },
      );
      showSuccess("Usuario creado exitosamente");
      closeModal();
      setPage(1);
      fetchUsuarios();
    } catch (err) {
      const message = err.response?.data?.message || "Error al crear usuario.";
      setFormErrors({ general: message });
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const errors = validateBaseUser({ ...editForm, assignSubscription: false });
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const payload = {};
    ["nombre", "email", "rol"].forEach((field) => {
      if (editForm[field] !== (modal.user[field] || "")) payload[field] = editForm[field];
    });

    if (!Object.keys(payload).length) {
      closeModal();
      return;
    }

    setSaving(true);
    try {
      await axios.patch(`${API_URL}/users/${modal.user._id}`, payload, {
        headers: authHeaders(),
      });
      showSuccess("Usuario actualizado");
      closeModal();
      fetchUsuarios();
    } catch (err) {
      const message = err.response?.data?.message || "Error al guardar usuario.";
      setFormErrors({ general: message });
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const submitSubscription = async (event) => {
    event.preventDefault();
    const errors = validateSubscriptionForm();
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const removing = subscriptionForm.action === "quitar";
    setSaving(true);
    try {
      await axios.patch(
        `${API_URL}/users/${modal.user._id}/subscription`,
        {
          suscrito: !removing,
          subscriptionStart: removing ? null : fromDatetimeLocal(subscriptionPreview.start),
          subscriptionEnd: removing ? null : fromDatetimeLocal(subscriptionPreview.end),
        },
        { headers: authHeaders() },
      );
      showSuccess("Suscripcion actualizada");
      closeModal();
      fetchUsuarios();
    } catch (err) {
      const message = err.response?.data?.message || "Error al actualizar suscripcion.";
      setFormErrors({ general: message });
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    setSaving(true);
    try {
      await axios.delete(`${API_URL}/user/${modal.user._id}`, {
        headers: authHeaders(),
      });
      showSuccess("Usuario eliminado");
      closeModal();
      fetchUsuarios();
    } catch (err) {
      const message = err.response?.data?.message || "Error al eliminar usuario.";
      setFormErrors({ general: message });
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { key: "todos", label: "Total de usuarios", value: stats.total },
    { key: "activa", label: "Suscripciones activas", value: stats.activos },
    { key: "vencida", label: "Suscripciones vencidas", value: stats.vencidos },
    { key: "admin", label: "Administradores", value: stats.admins, role: "admin" },
  ];

  return (
    <div className="users-admin bg-light">
      <div className="container-xxl py-4">
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
          <div>
            <p className="text-uppercase text-muted fw-bold small mb-1">Dashboard</p>
            <h2 className="mb-1">Usuarios</h2>
            <p className="text-muted mb-0">
              Gestiona cuentas, roles y suscripciones desde un solo modulo.
            </p>
          </div>
          <button className="btn btn-primary align-self-lg-start" onClick={openCreateModal}>
            <FiUserPlus className="me-2" />
            Crear usuario
          </button>
        </div>

        <div className="row g-3 mb-4">
          {statCards.map((card) => {
            const selected = card.role
              ? roleFilter === card.role
              : card.key === "todos"
                ? roleFilter === "todos" && subscriptionFilter === "todos"
                : subscriptionFilter === card.key;
            return (
              <div className="col-6 col-xl-3" key={card.label}>
                <button
                  type="button"
                  className={`card users-stat-card w-100 text-start ${selected ? "active" : ""}`}
                  onClick={() => {
                    if (card.role) {
                      changeRoleFilter(card.role);
                      changeSubscriptionFilter("todos");
                    } else {
                      changeRoleFilter("todos");
                      changeSubscriptionFilter(card.key);
                    }
                  }}
                >
                  <span className="text-muted small text-uppercase fw-bold">{card.label}</span>
                  <strong className="display-6">{card.value}</strong>
                </button>
              </div>
            );
          })}
        </div>

        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-xl-4">
                <label className="form-label" htmlFor="user-search">
                  Buscar por nombre o correo
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FiSearch aria-hidden="true" />
                  </span>
                  <input
                    id="user-search"
                    className="form-control"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Nombre o correo"
                  />
                </div>
              </div>

              <div className="col-6 col-xl-2">
                <label className="form-label" htmlFor="role-filter">
                  Rol
                </label>
                <select
                  id="role-filter"
                  className="form-select"
                  value={roleFilter}
                  onChange={(event) => changeRoleFilter(event.target.value)}
                >
                  {ROLE_FILTERS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-xl-2">
                <label className="form-label" htmlFor="subscription-filter">
                  Suscripcion
                </label>
                <select
                  id="subscription-filter"
                  className="form-select"
                  value={subscriptionFilter}
                  onChange={(event) => changeSubscriptionFilter(event.target.value)}
                >
                  {SUBSCRIPTION_FILTERS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-xl-2">
                <label className="form-label" htmlFor="page-size">
                  Por pagina
                </label>
                <select
                  id="page-size"
                  className="form-select"
                  value={limit}
                  onChange={(event) => changeLimit(event.target.value)}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-xl-2 d-grid gap-2 d-sm-flex">
                <button
                  className="btn btn-outline-secondary flex-fill"
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasFilters && sortBy === "createdAt"}
                >
                  Limpiar
                </button>
                <button
                  className="btn btn-outline-primary flex-fill"
                  type="button"
                  onClick={fetchUsuarios}
                  disabled={loading}
                >
                  <FiRefreshCw className={loading ? "users-spin me-1" : "me-1"} />
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="card shadow-sm users-table-card">
          <div className="table-responsive d-none d-lg-block">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>
                    <button className="btn btn-link p-0" onClick={() => toggleSort("nombre")}>
                      Usuario
                    </button>
                  </th>
                  <th>
                    <button className="btn btn-link p-0" onClick={() => toggleSort("rol")}>
                      Rol
                    </button>
                  </th>
                  <th>
                    <button className="btn btn-link p-0" onClick={() => toggleSort("estado")}>
                      Suscripcion
                    </button>
                  </th>
                  <th>
                    <button
                      className="btn btn-link p-0"
                      onClick={() => toggleSort("vencimiento")}
                    >
                      Periodo
                    </button>
                  </th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      Cargando informacion...
                    </td>
                  </tr>
                ) : usuarios.length ? (
                  usuarios.map((user) => {
                    const status = getSubscriptionStatus(user);
                    const isOwnUser = currentUserId === user._id;
                    const isLastAdmin = user.rol === "admin" && stats.admins <= 1;

                    return (
                      <tr key={user._id}>
                        <td>
                          <strong>{user.nombre}</strong>
                          <div className="text-muted small">{user.email}</div>
                        </td>
                        <td>
                          <span
                            className={`badge ${user.rol === "admin" ? "bg-dark" : "bg-primary"}`}
                          >
                            {user.rol === "admin" ? "Admin" : "Cantante"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge bg-${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td>
                          <div className="small">
                            <strong>Inicio:</strong> {formatDate(user.subscriptionStart)}
                          </div>
                          <div className="small">
                            <strong>Fin:</strong> {formatDate(user.subscriptionEnd)}
                          </div>
                          <div className="text-muted small">{getPeriodHint(user)}</div>
                        </td>
                        <td>
                          <div className="d-flex justify-content-end gap-2">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              title="Ver detalles"
                              aria-label={`Ver detalles de ${user.nombre}`}
                              onClick={() => setModal({ type: "details", user })}
                            >
                              <FiEye />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              title="Editar usuario"
                              aria-label={`Editar usuario ${user.nombre}`}
                              onClick={() => openEditModal(user)}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-info"
                              title="Administrar suscripcion"
                              aria-label={`Administrar suscripcion de ${user.nombre}`}
                              onClick={() => openSubscriptionModal(user)}
                            >
                              <FiRefreshCw />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title={
                                isOwnUser
                                  ? "No puedes eliminar tu propia cuenta"
                                  : isLastAdmin
                                    ? "No puedes eliminar el ultimo administrador"
                                    : "Eliminar usuario"
                              }
                              aria-label={`Eliminar usuario ${user.nombre}`}
                              disabled={isOwnUser || isLastAdmin}
                              onClick={() => setModal({ type: "delete", user })}
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
                    <td colSpan="5">
                      <EmptyState hasFilters={hasFilters} onClear={resetFilters} onCreate={openCreateModal} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-lg-none p-3">
            {loading ? (
              <div className="text-center py-5 text-muted">Cargando informacion...</div>
            ) : usuarios.length ? (
              <div className="d-grid gap-3">
                {usuarios.map((user) => {
                  const status = getSubscriptionStatus(user);
                  const isOwnUser = currentUserId === user._id;
                  const isLastAdmin = user.rol === "admin" && stats.admins <= 1;

                  return (
                    <div className="card users-mobile-card" key={user._id}>
                      <div className="card-body">
                        <div className="d-flex justify-content-between gap-3">
                          <div>
                            <strong>{user.nombre}</strong>
                            <div className="text-muted small">{user.email}</div>
                          </div>
                          <span className={`badge bg-${status.className} align-self-start`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="mt-3 d-flex flex-wrap gap-2">
                          <span className={`badge ${user.rol === "admin" ? "bg-dark" : "bg-primary"}`}>
                            {user.rol === "admin" ? "Admin" : "Cantante"}
                          </span>
                          <span className="badge bg-light text-dark">{getPeriodHint(user)}</span>
                        </div>
                        <div className="mt-3 small">
                          <div>Inicio: {formatDate(user.subscriptionStart)}</div>
                          <div>Fin: {formatDate(user.subscriptionEnd)}</div>
                        </div>
                        <div className="d-flex flex-wrap gap-2 mt-3">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setModal({ type: "details", user })}>
                            <FiEye className="me-1" />
                            Ver
                          </button>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openEditModal(user)}>
                            <FiEdit2 className="me-1" />
                            Editar
                          </button>
                          <button className="btn btn-sm btn-outline-info" onClick={() => openSubscriptionModal(user)}>
                            <FiRefreshCw className="me-1" />
                            Suscripcion
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            disabled={isOwnUser || isLastAdmin}
                            onClick={() => setModal({ type: "delete", user })}
                          >
                            <FiTrash className="me-1" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState hasFilters={hasFilters} onClear={resetFilters} onCreate={openCreateModal} />
            )}
          </div>
        </div>

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mt-3">
          <span className="text-muted small">
            {pagination.total
              ? `Mostrando ${firstVisibleItem}-${lastVisibleItem} de ${pagination.total} usuarios`
              : "Sin resultados"}
          </span>

          <nav aria-label="Paginacion de usuarios">
            <ul className="pagination mb-0 flex-wrap">
              <li className={`page-item ${pagination.page <= 1 || loading ? "disabled" : ""}`}>
                <button
                  className="page-link"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => setPage(pagination.page - 1)}
                >
                  <FiChevronLeft />
                  <span className="visually-hidden">Pagina anterior</span>
                </button>
              </li>
              {pageItems.map((item) =>
                typeof item === "number" ? (
                  <li
                    className={`page-item ${item === pagination.page ? "active" : ""}`}
                    key={item}
                  >
                    <button
                      className="page-link"
                      disabled={loading}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  </li>
                ) : (
                  <li className="page-item disabled" key={item}>
                    <span className="page-link">...</span>
                  </li>
                ),
              )}
              <li
                className={`page-item ${
                  pagination.page >= pagination.totalPages || loading ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => setPage(pagination.page + 1)}
                >
                  <FiChevronRight />
                  <span className="visually-hidden">Pagina siguiente</span>
                </button>
              </li>
            </ul>
          </nav>

          <strong className="small">
            Pagina {pagination.totalPages ? pagination.page : 0} de {pagination.totalPages}
          </strong>
        </div>
      </div>

      {modal.type === "create" && (
        <Modal
          title="Crear usuario"
          subtitle="Nuevo registro"
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeModal}>
                Cancelar
              </button>
              <button className="btn btn-primary" form="create-user-form" disabled={saving}>
                {saving ? "Creando..." : "Crear usuario"}
              </button>
            </>
          }
        >
          <UserForm
            id="create-user-form"
            mode="create"
            form={createForm}
            errors={formErrors}
            onChange={updateCreateField}
            onSubmit={submitCreate}
          />
        </Modal>
      )}

      {modal.type === "edit" && editForm && (
        <Modal
          title="Editar usuario"
          subtitle={modal.user?.email}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeModal}>
                Cancelar
              </button>
              <button className="btn btn-primary" form="edit-user-form" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </>
          }
        >
          <UserForm
            id="edit-user-form"
            mode="edit"
            form={editForm}
            errors={formErrors}
            onChange={updateEditField}
            onSubmit={submitEdit}
          />
        </Modal>
      )}

      {modal.type === "subscription" && subscriptionForm && (
        <Modal
          title="Administrar suscripcion"
          subtitle={modal.user?.email}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeModal}>
                Cancelar
              </button>
              <button className="btn btn-primary" form="subscription-form" disabled={saving}>
                {saving ? "Guardando..." : "Guardar suscripcion"}
              </button>
            </>
          }
        >
          <SubscriptionForm
            form={subscriptionForm}
            preview={subscriptionPreview}
            errors={formErrors}
            onChange={(field, value) =>
              setSubscriptionForm((prev) => ({ ...prev, [field]: value }))
            }
            onSubmit={submitSubscription}
          />
        </Modal>
      )}

      {modal.type === "details" && modal.user && (
        <Modal title="Detalles del usuario" subtitle={modal.user.email} onClose={closeModal}>
          <UserDetails user={modal.user} />
        </Modal>
      )}

      {modal.type === "delete" && modal.user && (
        <Modal
          title="Eliminar usuario"
          subtitle="Confirmacion"
          onClose={closeModal}
          size="md"
          footer={
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeModal}>
                Cancelar
              </button>
              <button className="btn btn-danger" type="button" onClick={submitDelete} disabled={saving}>
                {saving ? "Eliminando..." : "Eliminar"}
              </button>
            </>
          }
        >
          {formErrors.general && <div className="alert alert-danger">{formErrors.general}</div>}
          <p>
            Vas a eliminar a <strong>{modal.user.nombre}</strong>.
          </p>
          <div className="border rounded p-3 bg-light">
            <div>{modal.user.email}</div>
            <div className="text-muted small">
              Si tiene suscripcion asociada, tambien dejara de existir con este usuario.
            </div>
          </div>
          <p className="text-muted small mt-3 mb-0">
            Esta accion se valida en el servidor para evitar eliminar tu propia cuenta o el
            ultimo administrador.
          </p>
        </Modal>
      )}
    </div>
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return <div className="invalid-feedback d-block">{children}</div>;
}

function UserForm({ id, mode, form, errors, onChange, onSubmit }) {
  const creating = mode === "create";

  return (
    <form id={id} onSubmit={onSubmit} noValidate>
      {errors.general && <div className="alert alert-danger">{errors.general}</div>}

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor={`${id}-nombre`}>
            Nombre
          </label>
          <input
            id={`${id}-nombre`}
            className={`form-control ${errors.nombre ? "is-invalid" : ""}`}
            value={form.nombre}
            onChange={(event) => onChange("nombre", event.target.value)}
            required
          />
          <FieldError>{errors.nombre}</FieldError>
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor={`${id}-email`}>
            Correo electronico
          </label>
          <input
            id={`${id}-email`}
            type="email"
            className={`form-control ${errors.email ? "is-invalid" : ""}`}
            value={form.email}
            onChange={(event) => onChange("email", event.target.value)}
            required
          />
          <FieldError>{errors.email}</FieldError>
        </div>

        {creating && (
          <>
            <div className="col-md-6">
              <label className="form-label" htmlFor={`${id}-password`}>
                Contrasena
              </label>
              <input
                id={`${id}-password`}
                type="text"
                className={`form-control ${errors.password ? "is-invalid" : ""}`}
                value={form.password}
                minLength={PASSWORD_MIN_LENGTH}
                onChange={(event) => onChange("password", event.target.value)}
                required
              />
              <FieldError>{errors.password}</FieldError>
            </div>

            <div className="col-md-6">
              <label className="form-label" htmlFor={`${id}-confirm-password`}>
                Confirmar contrasena
              </label>
              <input
                id={`${id}-confirm-password`}
                type="text"
                className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
                value={form.confirmPassword}
                onChange={(event) => onChange("confirmPassword", event.target.value)}
                required
              />
              <FieldError>{errors.confirmPassword}</FieldError>
            </div>
          </>
        )}

        <div className="col-md-6">
          <label className="form-label" htmlFor={`${id}-rol`}>
            Rol
          </label>
          <select
            id={`${id}-rol`}
            className={`form-select ${errors.rol ? "is-invalid" : ""}`}
            value={form.rol}
            onChange={(event) => onChange("rol", event.target.value)}
            required
          >
            <option value="cantante">Cantante</option>
            <option value="admin">Admin</option>
          </select>
          <FieldError>{errors.rol}</FieldError>
        </div>

        {creating && (
          <>
            <div className="col-md-6 d-flex align-items-end">
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id={`${id}-assign-subscription`}
                  checked={form.assignSubscription}
                  onChange={(event) => onChange("assignSubscription", event.target.checked)}
                />
                <label className="form-check-label" htmlFor={`${id}-assign-subscription`}>
                  Asignar suscripcion
                </label>
              </div>
            </div>

            {form.assignSubscription && (
              <>
                <div className="col-md-6">
                  <label className="form-label" htmlFor={`${id}-start`}>
                    Fecha de inicio
                  </label>
                  <input
                    id={`${id}-start`}
                    type="datetime-local"
                    className={`form-control ${errors.subscriptionStart ? "is-invalid" : ""}`}
                    value={form.subscriptionStart}
                    onChange={(event) => onChange("subscriptionStart", event.target.value)}
                    required
                  />
                  <FieldError>{errors.subscriptionStart}</FieldError>
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor={`${id}-end`}>
                    Fecha de finalizacion
                  </label>
                  <input
                    id={`${id}-end`}
                    type="datetime-local"
                    className={`form-control ${errors.subscriptionEnd ? "is-invalid" : ""}`}
                    value={form.subscriptionEnd}
                    onChange={(event) => onChange("subscriptionEnd", event.target.value)}
                    required
                  />
                  <FieldError>{errors.subscriptionEnd}</FieldError>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </form>
  );
}

function SubscriptionForm({ form, preview, errors, onChange, onSubmit }) {
  return (
    <form id="subscription-form" onSubmit={onSubmit} noValidate>
      {errors.general && <div className="alert alert-danger">{errors.general}</div>}

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="subscription-action">
            Accion
          </label>
          <select
            id="subscription-action"
            className="form-select"
            value={form.action}
            onChange={(event) => onChange("action", event.target.value)}
          >
            <option value="asignar">Asignar o cambiar fechas</option>
            <option value="renovar">Renovar</option>
            <option value="quitar">Quitar suscripcion</option>
          </select>
        </div>

        {form.action !== "quitar" && (
          <>
            {form.action === "renovar" ? (
              <>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="renew-days">
                    Dias a agregar
                  </label>
                  <input
                    id="renew-days"
                    type="number"
                    min="1"
                    className={`form-control ${errors.renewDays ? "is-invalid" : ""}`}
                    value={form.renewDays}
                    onChange={(event) => onChange("renewDays", event.target.value)}
                  />
                  <FieldError>{errors.renewDays}</FieldError>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="renew-start">
                    Comenzar desde
                  </label>
                  <input
                    id="renew-start"
                    type="datetime-local"
                    className={`form-control ${errors.subscriptionStart ? "is-invalid" : ""}`}
                    value={form.subscriptionStart}
                    onChange={(event) => onChange("subscriptionStart", event.target.value)}
                  />
                  <FieldError>{errors.subscriptionStart}</FieldError>
                </div>
              </>
            ) : (
              <>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="subscription-start">
                    Fecha de inicio
                  </label>
                  <input
                    id="subscription-start"
                    type="datetime-local"
                    className={`form-control ${errors.subscriptionStart ? "is-invalid" : ""}`}
                    value={form.subscriptionStart}
                    onChange={(event) => onChange("subscriptionStart", event.target.value)}
                    required
                  />
                  <FieldError>{errors.subscriptionStart}</FieldError>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="subscription-end">
                    Fecha de finalizacion
                  </label>
                  <input
                    id="subscription-end"
                    type="datetime-local"
                    className={`form-control ${errors.subscriptionEnd ? "is-invalid" : ""}`}
                    value={form.subscriptionEnd}
                    onChange={(event) => onChange("subscriptionEnd", event.target.value)}
                    required
                  />
                  <FieldError>{errors.subscriptionEnd}</FieldError>
                </div>
              </>
            )}

            {preview && (
              <div className="col-12">
                <div className="alert alert-info mb-0">
                  <strong>Resultado:</strong> {formatDate(preview.start)} hasta{" "}
                  {formatDate(preview.end)}
                </div>
                <FieldError>{errors.subscriptionEnd}</FieldError>
              </div>
            )}
          </>
        )}

        {form.action === "quitar" && (
          <div className="col-12">
            <div className="alert alert-warning mb-0">
              Se quitaran las fechas y el usuario quedara sin suscripcion.
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

function UserDetails({ user }) {
  const status = getSubscriptionStatus(user);

  return (
    <dl className="row mb-0">
      <dt className="col-sm-4">Nombre</dt>
      <dd className="col-sm-8">{user.nombre}</dd>
      <dt className="col-sm-4">Correo</dt>
      <dd className="col-sm-8">{user.email}</dd>
      <dt className="col-sm-4">Rol</dt>
      <dd className="col-sm-8">{user.rol === "admin" ? "Admin" : "Cantante"}</dd>
      <dt className="col-sm-4">Suscripcion</dt>
      <dd className="col-sm-8">
        <span className={`badge bg-${status.className}`}>{status.label}</span>
      </dd>
      <dt className="col-sm-4">Inicio</dt>
      <dd className="col-sm-8">{formatDate(user.subscriptionStart)}</dd>
      <dt className="col-sm-4">Finalizacion</dt>
      <dd className="col-sm-8">{formatDate(user.subscriptionEnd)}</dd>
      <dt className="col-sm-4">Resumen</dt>
      <dd className="col-sm-8">{getPeriodHint(user)}</dd>
    </dl>
  );
}

function EmptyState({ hasFilters, onClear, onCreate }) {
  return (
    <div className="text-center py-5">
      <h5>{hasFilters ? "No hay resultados" : "Todavia no hay usuarios"}</h5>
      <p className="text-muted mb-3">
        {hasFilters
          ? "Prueba limpiar los filtros o ajustar la busqueda."
          : "Crea el primer usuario para comenzar."}
      </p>
      {hasFilters ? (
        <button className="btn btn-outline-secondary" onClick={onClear}>
          Limpiar filtros
        </button>
      ) : (
        <button className="btn btn-primary" onClick={onCreate}>
          <FiUserPlus className="me-2" />
          Crear usuario
        </button>
      )}
    </div>
  );
}
