/** 文章点赞 */
import request from './request'

export function likeArticle(id: number | string) {
  return request.post(`/blog/articles/${id}/like`).then((r) => r.data)
}
export function unlikeArticle(id: number | string) {
  return request.delete(`/blog/articles/${id}/like`).then((r) => r.data)
}

/** 收藏文章 */
export function favoriteArticle(id: number | string) {
  return request.post(`/blog/articles/${id}/favorite`).then((r) => r.data)
}
export function unfavoriteArticle(id: number | string) {
  return request.delete(`/blog/articles/${id}/favorite`).then((r) => r.data)
}

/** 在线心跳（登录用户按 UserID，未登录按 IP） */
export function heartbeat(data?: { path?: string }) {
  return request.post('/blog/heartbeat', data || {}).then((r) => r.data)
}
/** 访问时长上报 */
export function recordVisitDuration(data: { duration: number; path: string }) {
  return request.post('/blog/visit', data).then((r) => r.data)
}
