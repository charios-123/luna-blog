import request from './request'

/** 点赞评论 */
export function likeComment(id: number | string) {
  return request.post(`/blog/comments/${id}/like`).then((r) => r.data)
}
export function unlikeComment(id: number | string) {
  return request.delete(`/blog/comments/${id}/like`).then((r) => r.data)
}

/** 管理员：删任意评论（走管理端接口） */
export function deleteCommentAsAdmin(id: number | string) {
  return request.delete(`/comments/${id}`).then((r) => r.data)
}

/* ============== 管理端 ============== */
export function listAdminComments(params: { page?: number; limit?: number; article_id?: number; status?: string } = {}) {
  return request.get('/comments', { params }).then((r) => r.data)
}
export function updateCommentStatus(id: number | string, status: 0 | 1 | 2) {
  return request.patch(`/comments/${id}/status`, { status }).then((r) => r.data)
}
