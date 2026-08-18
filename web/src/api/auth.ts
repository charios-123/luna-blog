import request from './request'

/** 博客前台认证：登录（account 可以是用户名或邮箱） */
export function login(data: { account: string; password: string }) {
  return request.post('/blog/auth/login', { username: data.account, password: data.password }).then((res) => res.data)
}

/** 博客前台认证：注册 */
export function register(data: { username: string; password: string; email?: string; nickname?: string; code?: string }) {
  return request.post('/blog/auth/register', data).then((res) => res.data)
}
