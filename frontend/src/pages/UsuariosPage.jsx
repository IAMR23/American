import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSliders,
  FiTrash,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { showError, showSuccess } from "../utils/swalAlerts";
import { getToken, getUserId } from "../utils/auth";
import "./UsuariosPage.css";

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
  password: "",
  confirmPassword: "",
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

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "US";

const getPeriodClass = (user) => {
  const status = getSubscriptionStatus(user);
  if (status.key === "activa") return "is-success";
  if (status.key === "vencida") return "is-danger";
  if (status.key === "programada") return "is-info";
  return "is-muted";
};

const getSubscriptionBadgeClass = (key) => {
  if (key === "activa") return "is-success";
  if (key === "vencida") return "is-danger";
  if (key === "programada") return "is-info";
  return "is-muted";
};

const SortIndicator = ({ field, sortBy, sortOrder }) => {
  if (sortBy !== field) return <span className="users-sort-indicator">--</span>;
  return <span className="users-sort-indicator is-active">{sortOrder === "asc" ? "ASC" : "DESC"}</span>;
};

const getAriaSort = (field, sortBy, sortOrder) => {
  if (sortBy !== field) return "none";
  return sortOrder === "asc" ? "ascending" : "descending";
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

function Modal({ title, subtitle, children, footer, onClose, size = "lg", saving = false }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, saving]);

  const requestClose = () => {
    if (!saving) onClose();
  };

  return (
    <>
      <div className="users-modal-backdrop" />
      <div
        className="users-modal-shell"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) requestClose();
        }}
      >
        <div className={`users-modal users-modal-${size}`}>
          <div className="users-modal-content">
            <div className="users-modal-header">
              <div>
                {subtitle && <div className="users-modal-kicker">{subtitle}</div>}
                <h5 className="users-modal-title">{title}</h5>
              </div>
              <button
                type="button"
                className="users-modal-close"
                aria-label="Cerrar"
                onClick={requestClose}
                disabled={saving}
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
            <div className="users-modal-body">{children}</div>
            {footer && <div className="users-modal-footer">{footer}</div>}
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
    {
      key: "todos",
      label: "Total de usuarios",
      value: stats.total,
      description: `${stats.sinSuscripcion} sin suscripcion`,
      icon: FiUsers,
    },
    {
      key: "activa",
      label: "Suscripciones activas",
      value: stats.activos,
      description: `${stats.programadas} programadas`,
      icon: FiCheckCircle,
    },
    {
      key: "vencida",
      label: "Suscripciones vencidas",
      value: stats.vencidos,
      description: "Requieren seguimiento",
      icon: FiAlertCircle,
    },
    {
      key: "admin",
      label: "Administradores",
      value: stats.admins,
      description: "Acceso al panel",
      icon: FiShield,
      role: "admin",
    },
  ];

  return (
    <div className="users-admin">
      <div className="users-admin-container">
        <div className="users-header">
          <div>
            <p className="users-breadcrumb">Administracion / Usuarios</p>
            <h1>Usuarios</h1>
            <p>
              Gestiona cuentas, roles y suscripciones desde un solo modulo.
            </p>
          </div>
          <button className="users-primary-button" onClick={openCreateModal}>
            <FiUserPlus aria-hidden="true" />
            Crear usuario
          </button>
        </div>

        <div className="users-stats-grid">
          {statCards.map((card) => {
            const Icon = card.icon;
            const selected = card.role
              ? roleFilter === card.role
              : card.key === "todos"
                ? roleFilter === "todos" && subscriptionFilter === "todos"
                : subscriptionFilter === card.key;
            return (
              <button
                type="button"
                className={`users-stat-card ${selected ? "is-active" : ""}`}
                aria-pressed={selected}
                key={card.label}
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
                <span className="users-stat-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="users-stat-copy">
                  <span className="users-stat-label">{card.label}</span>
                  <strong className="users-stat-value">{card.value}</strong>
                  <span className="users-stat-description">{card.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <section className="users-toolbar" aria-label="Filtros de usuarios">
          <div className="users-toolbar-grid">
            <div className="users-control users-control-search">
              <label htmlFor="user-search">Buscar</label>
              <div className="users-input-icon">
                <FiSearch aria-hidden="true" />
                <input
                  id="user-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Nombre o correo"
                />
              </div>
            </div>

            <div className="users-control">
              <label htmlFor="role-filter">Rol</label>
              <div className="users-select-icon">
                <FiUsers aria-hidden="true" />
                <select
                  id="role-filter"
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
            </div>

            <div className="users-control">
              <label htmlFor="subscription-filter">Suscripcion</label>
              <div className="users-select-icon">
                <FiFilter aria-hidden="true" />
                <select
                  id="subscription-filter"
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
            </div>

            <div className="users-control">
              <label htmlFor="page-size">Por pagina</label>
              <div className="users-select-icon">
                <FiSliders aria-hidden="true" />
                <select
                  id="page-size"
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
            </div>

            <button
              className="users-refresh-button"
              type="button"
              onClick={fetchUsuarios}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "users-spin" : ""} aria-hidden="true" />
              Actualizar
            </button>
          </div>

          {(hasFilters || sortBy !== "createdAt") && (
            <div className="users-active-filters" aria-label="Filtros activos">
              {searchInput && <span className="users-filter-chip">Busqueda: {searchInput}</span>}
              {roleFilter !== "todos" && (
                <span className="users-filter-chip">
                  Rol: {ROLE_FILTERS.find((option) => option.value === roleFilter)?.label}
                </span>
              )}
              {subscriptionFilter !== "todos" && (
                <span className="users-filter-chip">
                  Suscripcion:{" "}
                  {SUBSCRIPTION_FILTERS.find((option) => option.value === subscriptionFilter)?.label}
                </span>
              )}
              {sortBy !== "createdAt" && <span className="users-filter-chip">Orden: {sortBy}</span>}
              <button className="users-clear-button" type="button" onClick={resetFilters}>
                Limpiar filtros
              </button>
            </div>
          )}
        </section>

        {error && (
          <div className="users-alert" role="alert">
            <FiAlertCircle aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={fetchUsuarios}>
              Reintentar
            </button>
          </div>
        )}

        <section className="users-table-card" aria-label="Listado de usuarios">
          <div className="table-responsive d-none d-lg-block">
            <table className="users-table">
              <thead>
                <tr>
                  <th aria-sort={getAriaSort("nombre", sortBy, sortOrder)}>
                    <button className="users-sort-button" onClick={() => toggleSort("nombre")}>
                      Usuario
                      <SortIndicator field="nombre" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("rol", sortBy, sortOrder)}>
                    <button className="users-sort-button" onClick={() => toggleSort("rol")}>
                      Rol
                      <SortIndicator field="rol" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("estado", sortBy, sortOrder)}>
                    <button className="users-sort-button" onClick={() => toggleSort("estado")}>
                      Suscripcion
                      <SortIndicator field="estado" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th aria-sort={getAriaSort("vencimiento", sortBy, sortOrder)}>
                    <button
                      className="users-sort-button"
                      onClick={() => toggleSort("vencimiento")}
                    >
                      Periodo
                      <SortIndicator field="vencimiento" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeletonRows />
                ) : usuarios.length ? (
                  usuarios.map((user) => {
                    const status = getSubscriptionStatus(user);
                    const isOwnUser = currentUserId === user._id;
                    const isLastAdmin = user.rol === "admin" && stats.admins <= 1;

                    return (
                      <tr key={user._id}>
                        <td>
                          <div className="users-person">
                            <span className="users-avatar" aria-hidden="true">
                              {getInitials(user.nombre)}
                            </span>
                            <span className="users-person-copy">
                              <strong>{user.nombre}</strong>
                              <span title={user.email}>{user.email}</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`users-role-badge ${user.rol === "admin" ? "is-admin" : "is-singer"}`}>
                            {user.rol === "admin" ? "Admin" : "Cantante"}
                          </span>
                        </td>
                        <td>
                          <span className={`users-status-badge ${getSubscriptionBadgeClass(status.key)}`}>
                            <span aria-hidden="true" />
                            {status.label}
                          </span>
                        </td>
                        <td>
                          <div className="users-period">
                            <span>
                              <strong>Inicio</strong>
                              {formatDate(user.subscriptionStart)}
                            </span>
                            <span>
                              <strong>Fin</strong>
                              {formatDate(user.subscriptionEnd)}
                            </span>
                            <em className={getPeriodClass(user)}>{getPeriodHint(user)}</em>
                          </div>
                        </td>
                        <td>
                          <div className="users-actions">
                            <button
                              className="users-action-button is-neutral"
                              title="Ver detalles"
                              aria-label={`Ver detalles de ${user.nombre}`}
                              onClick={() => setModal({ type: "details", user })}
                            >
                              <FiEye aria-hidden="true" />
                            </button>
                            <button
                              className="users-action-button is-primary"
                              title="Editar usuario"
                              aria-label={`Editar usuario ${user.nombre}`}
                              onClick={() => openEditModal(user)}
                            >
                              <FiEdit2 aria-hidden="true" />
                            </button>
                            <button
                              className="users-action-button is-subscription"
                              title="Administrar suscripcion"
                              aria-label={`Administrar suscripcion de ${user.nombre}`}
                              onClick={() => openSubscriptionModal(user)}
                            >
                              <FiRefreshCw aria-hidden="true" />
                            </button>
                            <button
                              className="users-action-button is-danger"
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
                              <FiTrash aria-hidden="true" />
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

          <div className="users-mobile-list d-lg-none">
            {loading ? (
              <MobileSkeletonCards />
            ) : usuarios.length ? (
              <div className="users-mobile-grid">
                {usuarios.map((user) => {
                  const status = getSubscriptionStatus(user);
                  const isOwnUser = currentUserId === user._id;
                  const isLastAdmin = user.rol === "admin" && stats.admins <= 1;

                  return (
                    <article className="users-mobile-card" key={user._id}>
                      <div className="users-mobile-head">
                        <div className="users-person">
                          <span className="users-avatar" aria-hidden="true">
                            {getInitials(user.nombre)}
                          </span>
                          <span className="users-person-copy">
                            <strong>{user.nombre}</strong>
                            <span title={user.email}>{user.email}</span>
                          </span>
                        </div>
                        <span className={`users-status-badge ${getSubscriptionBadgeClass(status.key)}`}>
                          <span aria-hidden="true" />
                          {status.label}
                        </span>
                      </div>

                      <div className="users-mobile-meta">
                        <span className={`users-role-badge ${user.rol === "admin" ? "is-admin" : "is-singer"}`}>
                          {user.rol === "admin" ? "Admin" : "Cantante"}
                        </span>
                        <span className={`users-period-hint ${getPeriodClass(user)}`}>
                          {getPeriodHint(user)}
                        </span>
                      </div>

                      <div className="users-period">
                        <span>
                          <strong>Inicio</strong>
                          {formatDate(user.subscriptionStart)}
                        </span>
                        <span>
                          <strong>Fin</strong>
                          {formatDate(user.subscriptionEnd)}
                        </span>
                      </div>

                      <div className="users-mobile-actions">
                        <button className="users-mobile-action is-neutral" onClick={() => setModal({ type: "details", user })}>
                          <FiEye aria-hidden="true" />
                          Ver
                        </button>
                        <button className="users-mobile-action is-primary" onClick={() => openEditModal(user)}>
                          <FiEdit2 aria-hidden="true" />
                          Editar
                        </button>
                        <button className="users-mobile-action is-subscription" onClick={() => openSubscriptionModal(user)}>
                          <FiRefreshCw aria-hidden="true" />
                          Suscripcion
                        </button>
                        <button
                          className="users-mobile-action is-danger"
                          title={
                            isOwnUser
                              ? "No puedes eliminar tu propia cuenta"
                              : isLastAdmin
                                ? "No puedes eliminar el ultimo administrador"
                                : "Eliminar usuario"
                          }
                          disabled={isOwnUser || isLastAdmin}
                          onClick={() => setModal({ type: "delete", user })}
                        >
                          <FiTrash aria-hidden="true" />
                          Eliminar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState hasFilters={hasFilters} onClear={resetFilters} onCreate={openCreateModal} />
            )}
          </div>
        </section>

        <div className="users-pagination-footer">
          <span>
            {pagination.total
              ? `Mostrando ${firstVisibleItem}-${lastVisibleItem} de ${pagination.total} usuarios`
              : "Sin resultados"}
          </span>

          <nav aria-label="Paginacion de usuarios">
            <ul className="users-pagination">
              <li>
                <button
                  className="users-page-button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => setPage(pagination.page - 1)}
                  aria-label="Pagina anterior"
                >
                  <FiChevronLeft aria-hidden="true" />
                </button>
              </li>
              {pageItems.map((item) =>
                typeof item === "number" ? (
                  <li key={item}>
                    <button
                      className={`users-page-button ${item === pagination.page ? "is-active" : ""}`}
                      disabled={loading}
                      onClick={() => setPage(item)}
                      aria-current={item === pagination.page ? "page" : undefined}
                    >
                      {item}
                    </button>
                  </li>
                ) : (
                  <li key={item}>
                    <span className="users-page-ellipsis">...</span>
                  </li>
                ),
              )}
              <li>
                <button
                  className="users-page-button"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => setPage(pagination.page + 1)}
                  aria-label="Pagina siguiente"
                >
                  <FiChevronRight aria-hidden="true" />
                </button>
              </li>
            </ul>
          </nav>

          <strong>
            Pagina {pagination.totalPages ? pagination.page : 0} de {pagination.totalPages}
          </strong>
        </div>
      </div>

      {modal.type === "create" && (
        <Modal
          title="Crear usuario"
          subtitle="Nuevo registro"
          onClose={closeModal}
          saving={saving}
          footer={
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeModal} disabled={saving}>
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
          saving={saving}
          footer={
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeModal} disabled={saving}>
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
          saving={saving}
          footer={
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeModal} disabled={saving}>
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
        <Modal title="Detalles del usuario" subtitle={modal.user.email} onClose={closeModal} saving={saving}>
          <UserDetails user={modal.user} />
        </Modal>
      )}

      {modal.type === "delete" && modal.user && (
        <Modal
          title="Eliminar usuario"
          subtitle="Confirmacion"
          onClose={closeModal}
          size="md"
          saving={saving}
          footer={
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeModal} disabled={saving}>
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <form id={id} className="users-form" onSubmit={onSubmit} noValidate>
      {errors.general && <div className="alert alert-danger">{errors.general}</div>}

      <div className="users-form-section">
        <h6>Datos de cuenta</h6>
        <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor={`${id}-nombre`}>
            Nombre <span aria-hidden="true">*</span>
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
            Correo electronico <span aria-hidden="true">*</span>
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
                Contrasena <span aria-hidden="true">*</span>
              </label>
              <div className="users-password-field">
                <input
                  id={`${id}-password`}
                  type={showPassword ? "text" : "password"}
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  value={form.password}
                  minLength={PASSWORD_MIN_LENGTH}
                  onChange={(event) => onChange("password", event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                >
                  {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                </button>
              </div>
              <FieldError>{errors.password}</FieldError>
            </div>

            <div className="col-md-6">
              <label className="form-label" htmlFor={`${id}-confirm-password`}>
                Confirmar contrasena <span aria-hidden="true">*</span>
              </label>
              <div className="users-password-field">
                <input
                  id={`${id}-confirm-password`}
                  type={showConfirmPassword ? "text" : "password"}
                  className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
                  value={form.confirmPassword}
                  onChange={(event) => onChange("confirmPassword", event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? "Ocultar confirmacion" : "Mostrar confirmacion"}
                >
                  {showConfirmPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                </button>
              </div>
              <FieldError>{errors.confirmPassword}</FieldError>
            </div>
          </>
        )}

        <div className="col-md-6">
          <label className="form-label" htmlFor={`${id}-rol`}>
            Rol <span aria-hidden="true">*</span>
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
        </div>
      </div>

        {creating && (
          <div className="users-form-section">
            <h6>Suscripcion inicial</h6>
            <div className="row g-3">
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
                    Fecha de inicio <span aria-hidden="true">*</span>
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
                    Fecha de finalizacion <span aria-hidden="true">*</span>
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
            </div>
          </div>
        )}
    </form>
  );
}

function SubscriptionForm({ form, preview, errors, onChange, onSubmit }) {
  return (
    <form id="subscription-form" className="users-form" onSubmit={onSubmit} noValidate>
      {errors.general && <div className="alert alert-danger">{errors.general}</div>}

      <div className="users-form-section">
      <h6>Configuracion de suscripcion</h6>
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
      </div>
    </form>
  );
}

function UserDetails({ user }) {
  const status = getSubscriptionStatus(user);

  return (
    <dl className="users-details-list">
      <dt className="col-sm-4">Nombre</dt>
      <dd className="col-sm-8">{user.nombre}</dd>
      <dt className="col-sm-4">Correo</dt>
      <dd className="col-sm-8">{user.email}</dd>
      <dt className="col-sm-4">Rol</dt>
      <dd className="col-sm-8">{user.rol === "admin" ? "Admin" : "Cantante"}</dd>
      <dt className="col-sm-4">Suscripcion</dt>
      <dd className="col-sm-8">
        <span className={`users-status-badge ${getSubscriptionBadgeClass(status.key)}`}>
          <span aria-hidden="true" />
          {status.label}
        </span>
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

function TableSkeletonRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr className="users-skeleton-row" key={index}>
      <td>
        <div className="users-person">
          <span className="users-skeleton-avatar" />
          <span className="users-skeleton-copy">
            <span />
            <span />
          </span>
        </div>
      </td>
      <td><span className="users-skeleton-pill" /></td>
      <td><span className="users-skeleton-pill" /></td>
      <td>
        <div className="users-skeleton-stack">
          <span />
          <span />
          <span />
        </div>
      </td>
      <td>
        <div className="users-actions">
          <span className="users-skeleton-action" />
          <span className="users-skeleton-action" />
          <span className="users-skeleton-action" />
          <span className="users-skeleton-action" />
        </div>
      </td>
    </tr>
  ));
}

function MobileSkeletonCards() {
  return (
    <div className="users-mobile-grid">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="users-mobile-card users-skeleton-card" key={index}>
          <div className="users-person">
            <span className="users-skeleton-avatar" />
            <span className="users-skeleton-copy">
              <span />
              <span />
            </span>
          </div>
          <div className="users-skeleton-stack">
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear, onCreate }) {
  return (
    <div className="users-empty-state">
      <div className="users-empty-icon">
        {hasFilters ? <FiSearch aria-hidden="true" /> : <FiUsers aria-hidden="true" />}
      </div>
      <h5>{hasFilters ? "No hay resultados" : "Todavia no hay usuarios"}</h5>
      <p>
        {hasFilters
          ? "Prueba limpiar los filtros o ajustar la busqueda."
          : "Crea el primer usuario para comenzar."}
      </p>
      {hasFilters ? (
        <button className="users-clear-button" onClick={onClear}>
          Limpiar filtros
        </button>
      ) : (
        <button className="users-primary-button" onClick={onCreate}>
          <FiUserPlus aria-hidden="true" />
          Crear usuario
        </button>
      )}
    </div>
  );
}
