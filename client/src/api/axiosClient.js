import axios from 'axios'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT from localStorage to every request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 Unauthorized globally
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')
      ) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default axiosClient
