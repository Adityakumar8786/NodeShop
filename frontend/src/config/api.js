import axios from 'axios';

const api = axios.create({
  baseURL: 'https://nodeshop-dt8w.onrender.com/api',   // ← Important: /api at the end
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
