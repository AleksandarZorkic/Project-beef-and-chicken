import axios from "axios";

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "https://localhost:7023/api";

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/i, "");

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((cfg) => {
  try {
    const saved = localStorage.getItem("auth");

    if (saved) {
      const { token } = JSON.parse(saved);

      if (token) {
        cfg.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {}

  return cfg;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth");
    }
    return Promise.reject(error);
  },
);

export default api;

export function setAuthToken(token?: string) {
  if (token) {
    localStorage.setItem("auth", JSON.stringify({ token }));
  } else {
    localStorage.removeItem("auth");
  }
}
