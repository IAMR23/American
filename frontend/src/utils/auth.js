import { jwtDecode } from "jwt-decode";

export function getToken() {
  return localStorage.getItem("token");
}

export function saveToken(token) {
  localStorage.setItem("token", token);
}

export function removeToken() {
  localStorage.removeItem("token");
}


export function getUserId() {
  try {
    const token = getToken(); 
    if (!token) return null;

    const decoded = jwtDecode(token);
    // Ajusta según cómo tengas el payload, aquí asumo "userId"
    return decoded.userId || null;
  } catch (error) {
    console.warn("No se pudo decodificar el token:", error);
    return null;
  }
}