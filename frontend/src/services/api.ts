import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

let documentsListInFlight: Promise<any> | null = null
let documentsListCache: any[] | null = null
let documentsListLastFetchAt = 0
const DOCUMENTS_LIST_COOLDOWN_MS = 2000

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE}/api/v1/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
}

// Users (admin)
export const usersApi = {
  list: () => api.get('/users/'),
  create: (data: object) => api.post('/users/', data),
  update: (id: number, data: object) => api.patch(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  stats: () => api.get('/users/stats/overview'),
}

// Documents
export const documentsApi = {
  list: () => {
    const now = Date.now()

    if (documentsListInFlight) {
      return documentsListInFlight
    }

    if (documentsListCache && now - documentsListLastFetchAt < DOCUMENTS_LIST_COOLDOWN_MS) {
      return Promise.resolve({ data: documentsListCache })
    }

    documentsListInFlight = api.get('/documents/')
      .then((res) => {
        documentsListCache = res.data
        documentsListLastFetchAt = Date.now()
        return res
      })
      .finally(() => {
        documentsListInFlight = null
      })

    return documentsListInFlight
  },
  upload: (formData: FormData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  get: (id: number) => api.get(`/documents/${id}`),
  delete: (id: number) => api.delete(`/documents/${id}`),
}

// Chat
export const chatApi = {
  createSession: (data: object) => api.post('/chat/sessions', data),
  listSessions: () => api.get('/chat/sessions'),
  getMessages: (sessionId: number) => api.get(`/chat/sessions/${sessionId}/messages`),
  deleteSession: (id: number) => api.delete(`/chat/sessions/${id}`),
}

export const BASE_URL = BASE
