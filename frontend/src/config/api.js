import axios from 'axios';

const api = axios.create({
  baseURL: 'https://nodeshop-dt8w.onrender.com/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('Session expired or not authenticated');
    }
    return Promise.reject(error);
  }
);

export default api;
