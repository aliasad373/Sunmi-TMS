// src/api/axios.js
import axios from "axios";

// Create an Axios instance with a base URL
const api = axios.create({
  baseURL: "http://203.175.74.144:2000/api", // 🔹 Replace with your backend base URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Add interceptors for token auth
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

export default api;
