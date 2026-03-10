import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.0.102:3000/api",   // 🔥 IMPORTANT (proxy handles backend)
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Attach token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🔥 Better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error("Network Error:", error.message);
      alert("Network error. Make sure backend is running.");
    } else {
      console.error(
        "API Error:",
        error.response.status,
        error.response.data
      );
    }

    return Promise.reject(error);
  }
);

export default api;