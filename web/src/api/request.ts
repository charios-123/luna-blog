import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useUserStore } from '@/stores/user'
import { toast } from './toast'

// API 基址：开发环境走 Vite 代理(/api)，生产环境同域
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor：加 Authorization（和 Vue 端 request.js 等价）
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useUserStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // FormData 请求由浏览器自动设置 Content-Type（含 boundary）
    if (config.data instanceof FormData) {
      delete (config.headers as any)['Content-Type']
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor：统一处理错误 + 解包内层 data
request.interceptors.response.use(
  (response) => {
    const res = response.data
    // 后端统一包装 { code, message, data }
    if (res && typeof res === 'object' && 'code' in res) {
      if (res.code === 0 || res.code === 200) {
        // 成功：把 response.data 替换为内层 data，调用方 .then(r => r.data) 直接拿到业务数据
        response.data = res.data
        return response
      }
      // 业务错误
      toast.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return response
  },
  (error: AxiosError) => {
    const status = error.response?.status
    const data: any = error.response?.data

    // 401：token 失效
    if (status === 401) {
      toast.error('登录已过期，请重新登录')
      useUserStore.getState().logout()
      if (location.pathname !== '/login') {
        location.href = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`
      }
      return Promise.reject(error)
    }

    if (status === 403) {
      toast.error('权限不足')
    } else if (data?.message) {
      toast.error(data.message)
    } else if (error.message && !error.message.includes('timeout')) {
      toast.error(error.message)
    } else {
      toast.error('网络错误，请稍后重试')
    }

    return Promise.reject(error)
  },
)

export default request
