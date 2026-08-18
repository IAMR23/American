const PASSWORD_STRENGTH_MESSAGE =
  "La contraseña debe tener mínimo 8 caracteres, mayúsculas, minúsculas, números y un carácter especial.";

const PASSWORD_STRENGTH_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const normalizeEmail = (email) => {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
};

const normalizeName = (nombre) => {
  if (typeof nombre !== "string") return "";
  return nombre.trim();
};

const validatePasswordStrength = (password) => {
  if (typeof password !== "string" || !password) {
    return "La contraseña es obligatoria";
  }

  if (!PASSWORD_STRENGTH_REGEX.test(password)) {
    return PASSWORD_STRENGTH_MESSAGE;
  }

  return null;
};

const serializeUser = (user) => {
  if (!user) return null;

  const plain =
    typeof user.toObject === "function"
      ? user.toObject({ versionKey: false })
      : user;

  return {
    _id: plain._id,
    nombre: plain.nombre,
    email: plain.email,
    rol: plain.rol,
    suscrito: plain.suscrito === true,
    subscriptionStart: plain.subscriptionStart ?? null,
    subscriptionEnd: plain.subscriptionEnd ?? null,
    subscriptionStatus: plain.subscriptionStatus,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

module.exports = {
  PASSWORD_STRENGTH_MESSAGE,
  PASSWORD_STRENGTH_REGEX,
  normalizeEmail,
  normalizeName,
  serializeUser,
  validatePasswordStrength,
};
