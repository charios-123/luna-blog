import request from './request'

/** 博客前台认证：登录（account 可以是用户名或邮箱） */
export function login(data: { account: string; password: string }) {
  return request.post('/blog/auth/login', { username: data.account, password: data.password }).then((res) => res.data)
}

/** 博客前台认证：注册 */
export function register(data: { username: string; password: string; email?: string; nickname?: string; code?: string }) {
  return request.post('/blog/auth/register', data).then((res) => res.data)
}

/** 发送邮箱验证码（登录/注册场景） */
export function sendLoginSmsCode(data: { email: string; scene?: string }) {
  return request.post('/blog/auth/send-code', data).then((res) => res.data)
}

/** 获取当前用户信息 */
export function getMe() {
  return request.get('/blog/auth/me').then((res) => res.data)
}

/** 更新资料 */
export function updateProfile(data: Record<string, any>) {
  return request.put('/blog/auth/profile', data).then((res) => res.data)
}

/** 修改密码 */
export function changePassword(data: { old_password: string; new_password: string }) {
  return request.put('/blog/auth/password', data).then((res) => res.data)
}

/** 管理员登录（独立的 auth/login 接口） */
export function adminLogin(data: { username: string; password: string }) {
  return request.post('/auth/login', data).then((res) => res.data)
}
