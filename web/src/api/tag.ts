import request from './request'

/** 前台：标签列表 */
export function getTags() {
  return request.get('/blog/tags').then((r) => r.data)
}

/** 前台：分类列表 */
export function getCategories() {
  return request.get('/blog/categories').then((r) => r.data)
}

/* ============== 管理端 ============== */
export function listAdminTags() {
  return request.get('/tags').then((r) => r.data)
}
export function createTag(data: { name: string; color?: string }) {
  return request.post('/tags', data).then((r) => r.data)
}
export function deleteTag(id: number | string) {
  return request.delete(`/tags/${id}`).then((r) => r.data)
}

export function listAdminCategories() {
  return request.get('/categories').then((r) => r.data)
}
export function createCategory(data: { name: string; description?: string }) {
  return request.post('/categories', data).then((r) => r.data)
}
export function deleteCategory(id: number | string) {
  return request.delete(`/categories/${id}`).then((r) => r.data)
}
