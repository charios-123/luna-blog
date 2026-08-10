import request from './request'

/** 前台：章节（按 tag 分组的学习笔记） */
export function getChaptersByTag(tag: string) {
  return request.get(`/blog/chapters/${tag}`).then((r) => r.data)
}

/* ============== 管理端 ============== */
export function listAdminChapters() {
  return request.get('/chapters').then((r) => r.data)
}
export function getAdminChapter(id: number | string) {
  return request.get(`/chapters/${id}`).then((r) => r.data)
}
export function createChapter(data: Record<string, any>) {
  return request.post('/chapters', data).then((r) => r.data)
}
export function updateChapter(id: number | string, data: Record<string, any>) {
  return request.put(`/chapters/${id}`, data).then((r) => r.data)
}
export function deleteChapter(id: number | string) {
  return request.delete(`/chapters/${id}`).then((r) => r.data)
}
