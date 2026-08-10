import request from './request'

/** 前台：文章评论列表 */
export function getArticleComments(articleId: number | string, params: { page?: number; limit?: number } = {}) {
  return request.get(`/blog/articles/${articleId}/comments`, { params }).then((r) => r.data)
}

/** 前台：发表评论 / 回复 */
export function createComment(data: {
  article_id: number | string
  content: string
  parent_id?: number | string
  reply_to_user_id?: number | string
}) {
  return request.post('/blog/comments', data).then((r) => r.data)
}

/** 前台：作者删自己评论 */
export function deleteComment(id: number | string) {
  return request.delete(`/blog/comments/${id}`).then((r) => r.data)
}

/** 管理员：删任意评论（走管理端接口） */
export function deleteCommentAsAdmin(id: number | string) {
  return request.delete(`/comments/${id}`).then((r) => r.data)
}

/** 点赞评论 */
export function likeComment(id: number | string) {
  return request.post(`/blog/comments/${id}/like`).then((r) => r.data)
}
export function unlikeComment(id: number | string) {
  return request.delete(`/blog/comments/${id}/like`).then((r) => r.data)
}

/* ============== 留言板 ============== */
export function getGuestbookMessages(params: { page?: number; limit?: number } = {}) {
  return request.get('/blog/guestbook', { params }).then((r) => r.data)
}
export function createGuestbookMessage(data: { content: string }) {
  return request.post('/blog/guestbook', data).then((r) => r.data)
}
export function deleteGuestbookMessage(id: number | string) {
  return request.delete(`/blog/guestbook/${id}`).then((r) => r.data)
}
export function deleteGuestbookAsAdmin(id: number | string) {
  return request.delete(`/comments/${id}`).then((r) => r.data) // 留言板和评论共用存储
}

/* ============== 管理端 ============== */
export function listAdminComments(params: { page?: number; limit?: number; article_id?: number; status?: string } = {}) {
  return request.get('/comments', { params }).then((r) => r.data)
}
export function updateCommentStatus(id: number | string, status: 0 | 1 | 2) {
  return request.patch(`/comments/${id}/status`, { status }).then((r) => r.data)
}
