import request from './request'

/** 前台：公开设置（备案号等） */
export function getPublicSettings() {
  return request.get('/blog/settings').then((r) => r.data)
}

/** 前台：博主信息（关于页） */
export function getBloggerInfo() {
  return request.get('/blog/blogger').then((r) => r.data)
}

/* ============== 管理端 ============== */
export function getAdminSettings() {
  return request.get('/settings').then((r) => r.data)
}
export function updateAdminSettings(data: Record<string, any>) {
  return request.put('/settings', data).then((r) => r.data)
}
