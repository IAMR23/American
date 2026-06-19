import axios from "axios";
import { getToken, removeToken, saveToken } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axios.defaults.withCredentials = true;

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_URL}/api/auth/refresh`,
        {},
        { withCredentials: true, skipAuthRefresh: true },
      )
      .then((response) => {
        const newToken = response.data?.accessToken || response.data?.token;

        if (!newToken) {
          throw new Error("El servidor no devolvio accessToken");
        }

        saveToken(newToken);
        return newToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

const attachAuthInterceptors = (client) => {
  client.interceptors.request.use((config) => {
    const token = getToken();

    config.withCredentials = true;

    if (token && !config.headers?.Authorization) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const status = error.response?.status;

      if (
        status !== 401 ||
        !originalRequest ||
        originalRequest._retry ||
        originalRequest.skipAuthRefresh ||
        originalRequest.url?.includes("/api/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newToken}`,
        };
        originalRequest.withCredentials = true;

        return client(originalRequest);
      } catch (refreshError) {
        removeToken();
        return Promise.reject(refreshError);
      }
    },
  );
};

attachAuthInterceptors(axios);
attachAuthInterceptors(api);

export { refreshAccessToken };
export default api;
