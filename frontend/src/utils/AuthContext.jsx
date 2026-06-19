import { createContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../services/axiosConfig";
import { getToken, removeToken, saveToken } from "./auth";

export const AuthContext = createContext();

const authFromToken = (token) => {
  if (!token) {
    return { isAuthenticated: false, rol: null, userId: null };
  }

  const decoded = jwtDecode(token);

  return {
    isAuthenticated: true,
    rol: decoded.rol,
    userId: decoded.userId || decoded.id,
  };
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(authFromToken(getToken()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await api.post("/api/auth/refresh");
        const token = response.data?.accessToken || response.data?.token;

        if (!token) throw new Error("Refresh sin accessToken");

        saveToken(token);
        setAuth(authFromToken(token));
      } catch {
        removeToken();
        setAuth({ isAuthenticated: false, rol: null, userId: null });
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      removeToken();
      setAuth({ isAuthenticated: false, rol: null, userId: null });
    }
  };

  const value = useMemo(
    () => ({ auth, setAuth, loading, logout }),
    [auth, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
