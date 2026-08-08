import axios from "axios";
import { getUserToken } from "../../hooks/useAuth";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL!|| "http://localhost:3002/api/v1/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

instance.interceptors.request.use((config) => {
  const token = getUserToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
