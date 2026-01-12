import axios from 'axios';

const isDev = import.meta.env.DEV;

export const api = axios.create({
 baseURL: isDev ? 'http://localhost:8000' : '',
  timeout: 10000,
 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error("Erro de Conexão: O Backend parece estar offline.");
    }
    return Promise.reject(error);
  }
);
