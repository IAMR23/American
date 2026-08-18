import { jwtDecode } from "jwt-decode";

const LOGOUT_AT_KEY = "americanKaraokeLogoutAt";

let accessToken = null;
let accessTokenIssuedAt = 0;

const getLogoutAt = () => {
  if (typeof window === "undefined") return 0;

  const logoutAt = Number.parseInt(
    window.localStorage.getItem(LOGOUT_AT_KEY) || "0",
    10,
  );

  return Number.isFinite(logoutAt) ? logoutAt : 0;
};

const clearLegacyAuthStorage = () => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem("token");
  window.localStorage.removeItem("rol");
};

const isTokenInvalidatedByLogout = () => {
  if (!accessToken) return false;

  const logoutAt = getLogoutAt();
  return Boolean(logoutAt && (!accessTokenIssuedAt || logoutAt >= accessTokenIssuedAt));
};

function notifyAuthChange() {
  window.dispatchEvent(new CustomEvent("auth-token-changed", { detail: accessToken }));
}

export function getToken() {
  return isTokenInvalidatedByLogout() ? null : accessToken;
}

export function saveToken(token) {
  accessToken = token || null;
  accessTokenIssuedAt = accessToken ? Date.now() : 0;

  // El JWT ya no se persiste en localStorage; solo queda en memoria.
  clearLegacyAuthStorage();

  if (accessToken && typeof window !== "undefined") {
    window.localStorage.removeItem(LOGOUT_AT_KEY);
  }

  notifyAuthChange();
}

export function removeToken({ markLogout = true } = {}) {
  accessToken = null;
  accessTokenIssuedAt = 0;

  clearLegacyAuthStorage();

  if (markLogout && typeof window !== "undefined") {
    window.localStorage.setItem(LOGOUT_AT_KEY, String(Date.now()));
  }

  notifyAuthChange();
}

export function syncTokenWithBrowserState() {
  if (isTokenInvalidatedByLogout()) {
    accessToken = null;
    accessTokenIssuedAt = 0;
    clearLegacyAuthStorage();
    notifyAuthChange();
  }

  return accessToken;
}

export function hasLogoutMarker() {
  return getLogoutAt() > 0;
}

export function getUserId() {
  try {
    const token = getToken();
    if (!token) return null;

    const decoded = jwtDecode(token);
    return decoded.userId || decoded.id || null;
  } catch (error) {
    console.warn("No se pudo decodificar el token:", error);
    return null;
  }
}
