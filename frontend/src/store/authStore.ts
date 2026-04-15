import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

interface UserInfo {
  id: string
  email: string
  name: string
  credits: number
  plan: string
  avatar?: string | null
}

interface AuthState {
  token: string | null
  user: UserInfo | null
  isAuthenticated: boolean
  setAuth: (token: string, user: UserInfo) => void
  updateCredits: (credits: number) => void
  updateUser: (data: Partial<UserInfo>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),

      updateCredits: (credits) =>
        set((s) => (s.user ? { user: { ...s.user, credits } } : {})),

      updateUser: (data) =>
        set((s) => (s.user ? { user: { ...s.user, ...data } } : {})),

      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    { name: 'auth' }
  )
)

// ── Axios interceptor — attach JWT to all requests ──
axios.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Auto-logout on 401 ──
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { isAuthenticated, logout } = useAuthStore.getState()
      if (isAuthenticated) {
        logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
