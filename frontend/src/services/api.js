import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor: inyectar token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('siexud_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor: manejar 401 (token expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('siexud_token')
      localStorage.removeItem('siexud_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
