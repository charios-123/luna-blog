import request from './request'

// 笔记列表（首页 / 笔记中心通用）
export function getNotes(params?: { page?: number; limit?: number; chapter_id?: any; keyword?: string }) {
  return request.get('/notes', { params }).catch(() => ({ list: [], total: 0 }))
}

// 章节（笔记分类）
export function getNoteChapters() {
  return request.get('/note-chapters').catch(() => [])
}

// 笔记详情
export function getNoteDetail(id: any) {
  return request.get(`/notes/${id}`).catch(() => null)
}

// 点赞 / 取消点赞
export function likeNote(id: any) {
  return request.post(`/notes/${id}/like`).catch(() => ({}))
}
export function unlikeNote(id: any) {
  return request.delete(`/notes/${id}/like`).catch(() => ({}))
}
