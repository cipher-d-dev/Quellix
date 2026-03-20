import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let _token: string | null = null;
export const setAccessToken = (t: string | null) => {
  _token = t;
};
export const getAccessToken = () => _token;

// Attach token to every outgoing request
api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

let refreshing = false;
let queue: Array<(t: string | null) => void> = [];
const drain = (t: string | null) => {
  queue.forEach((cb) => cb(t));
  queue = [];
};

const AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/refresh"];

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config;

    // Don't intercept non-401s, already-retried requests, or any auth route
    if (
      err.response?.status !== 401 ||
      orig._retry ||
      AUTH_ROUTES.some((route) => orig.url?.includes(route))
    ) {
      return Promise.reject(err);
    }

    // Queue concurrent requests while a refresh is in-flight
    if (refreshing) {
      return new Promise((res, rej) =>
        queue.push((t) => (t ? res(api(orig)) : rej(err))),
      );
    }

    orig._retry = true;
    refreshing = true;

    try {
      const { data } = await api.post("/auth/refresh");
      setAccessToken(data.data.accessToken);
      refreshing = false;
      drain(_token);
      return api(orig);
    } catch {
      refreshing = false;
      drain(null);
      setAccessToken(null);
      window.location.href = "/signin";
      return Promise.reject(err);
    }
  },
);
