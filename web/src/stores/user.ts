import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { login as apiLogin, register as apiRegister } from '@/api/auth'

export interface UserInfo {
  id: number
  username: string
  nickname?: string
  role: 'admin' | 'user'
  avatar?: string
  email?: string
  [key: string]: any
}

interface UserState {
  user: UserInfo | null
  token: string | null

  initUser: () => void
  login: (credentials: { username: string; password: string }) => Promise<{ success: boolean; message?: string }>
  register: (credentials: { username: string; password: string; email?: string; nickname?: string }) => Promise<{ success: boolean; message?: string }>
  setAuth: (token: string, user: UserInfo) => void
  logout: () => void
  updateUser: (patch: Partial<UserInfo>) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      initUser() {
        // persist 会自动从 localStorage 恢复，这里仅兜底
        const t = get().token
        if (t) {
          // token 已存在，保持状态
        }
      },

      async login(credentials) {
        try {
          const response = await apiLogin({ account: credentials.username, password: credentials.password })
          // interceptor 已解包，response 就是 { token, user }
          const { token, user } = response as { token: string; user: UserInfo }
          set({ token, user })
          return { success: true }
        } catch (error: any) {
          console.error('Login error:', error)
          let msg = '登录失败'
          if (error.response?.data?.message) msg = error.response.data.message
          else if (error.message) msg = error.message
          return { success: false, message: msg }
        }
      },

      async register(credentials) {
        try {
          const response = await apiRegister(credentials)
          const { token, user } = response as { token: string; user: UserInfo }
          set({ token, user })
          return { success: true }
        } catch (error: any) {
          console.error('Register error:', error)
          let msg = '注册失败'
          if (error.response?.data?.message) msg = error.response.data.message
          else if (error.message) msg = error.message
          return { success: false, message: msg }
        }
      },

      setAuth(token, user) {
        set({ token, user })
      },

      logout() {
        set({ user: null, token: null })
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      },

      updateUser(patch) {
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user }))
      },
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
)

// Convenience selectors (避免重复写法)
useUserStore.subscribe = undefined as any
export const selectIsLoggedIn = (s: UserState) => !!s.token
export const selectIsAdmin = (s: UserState) => s.user?.role === 'admin'
export const selectUsername = (s: UserState) => s.user?.nickname || s.user?.username || ''
export const selectAvatar = (s: UserState) => s.user?.avatar || ''
export const selectUser = (s: UserState) => s.user
/** userStore 是 useUserStore 的别名，方便在非 hook 场景通过 getState() 调用 */
export const userStore = useUserStore
