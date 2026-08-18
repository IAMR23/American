import { createContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../services/axiosConfig";
import {
  getToken,
  hasLogoutMarker,
  removeToken,
  saveToken,
  syncTokenWithBrowserState,
} from "./auth";

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
      if (hasLogoutMarker()) {
        removeToken({ markLogout: false });
        setAuth({ isAuthenticated: false, rol: null, userId: null });
        setLoading(false);
        return;
      }

      try {
        const response = await api.post("/api/auth/refresh");
        const token = response.data?.accessToken || response.data?.token;

        if (!token) throw new Error("Refresh sin accessToken");

        saveToken(token);
        setAuth(authFromToken(token));
      } catch {
        removeToken({ markLogout: false });
        setAuth({ isAuthenticated: false, rol: null, userId: null });
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    const syncBrowserSession = () => {
      const token = syncTokenWithBrowserState();

      setAuth(
        token
          ? authFromToken(token)
          : { isAuthenticated: false, rol: null, userId: null },
      );
    };

    const syncVisibleSession = () => {
      if (!document.hidden) {
        syncBrowserSession();
      }
    };

    window.addEventListener("auth-token-changed", syncBrowserSession);
    window.addEventListener("pageshow", syncBrowserSession);
    window.addEventListener("focus", syncBrowserSession);
    window.addEventListener("storage", syncBrowserSession);
    document.addEventListener("visibilitychange", syncVisibleSession);

    return () => {
      window.removeEventListener("auth-token-changed", syncBrowserSession);
      window.removeEventListener("pageshow", syncBrowserSession);
      window.removeEventListener("focus", syncBrowserSession);
      window.removeEventListener("storage", syncBrowserSession);
      document.removeEventListener("visibilitychange", syncVisibleSession);
    };
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
