import { jwtDecode } from "jwt-decode";

let accessToken = null;

function notifyAuthChange() {
  window.dispatchEvent(new CustomEvent("auth-token-changed", { detail: accessToken }));
}

export function getToken() {
  return accessToken;
}

export function saveToken(token) {
  accessToken = token || null;
  // El JWT ya no se persiste en localStorage; solo queda en memoria.
  localStorage.removeItem("token");
  localStorage.removeItem("rol");
  notifyAuthChange();
}

export function removeToken() {
  accessToken = null;
  localStorage.removeItem("token");
  localStorage.removeItem("rol");
  notifyAuthChange();
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
