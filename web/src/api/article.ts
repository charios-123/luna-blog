import request from './request'

export interface ListParams {
  page?: number
  limit?: number
  keyword?: string
  category_id?: number | string
  tag_id?: number | string
  status?: number | string
}

/** 前台：文章列表 */
export function getArticles(params: ListParams = {}) {
  return request.get('/blog/articles', { params }).then((r) => r.data)
}

/** 前台：搜索 */
export function searchArticles(keyword: string, params: ListParams = {}) {
  return request.get('/blog/articles/search', { params: { keyword, ...params } }).then((r) => r.data)
}

/** 前台：归档 */
export function getArchive() {
  return request.get('/blog/articles/archive').then((r) => r.data)
}

/** 前台：文章详情（支持登录态点赞/收藏状态） */
export function getArticleDetail(id: number | string) {
  return request.get(`/blog/articles/${id}`).then((r) => r.data)
}

/** 前台：上一篇 / 下一篇 */
export function getAdjacentArticles(id: number | string) {
  return request.get(`/blog/articles/${id}/adjacent`).then((r) => r.data)
}

/** 前台：相关文章推荐 */
export function getRelatedArticles(id: number | string) {
  return request.get(`/blog/articles/${id}/related`).then((r) => r.data)
}

/* ====================== 管理后台（占位，后续对接真实 API） ====================== */

/** 管理端：文章列表 */
export function listAdminArticles(params: ListParams = {}) {
  return request.get('/articles', { params }).then((r) => r.data)
}

/** 管理端：文章详情（编辑用） */
export function getAdminArticle(id: number | string) {
  return request.get(`/articles/${id}`).then((r) => r.data)
}

/** 管理端：创建文章 */
export function createArticle(data: Record<string, any>) {
  return request.post('/articles', data).then((r) => r.data)
}

/** 管理端：更新文章 */
export function updateArticle(id: number | string, data: Record<string, any>) {
  return request.put(`/articles/${id}`, data).then((r) => r.data)
}

/** 管理端：删除文章 */
export function deleteArticle(id: number | string) {
  return request.delete(`/articles/${id}`).then((r) => r.data)
}

/** 管理端：批量删除 */
export function batchDeleteArticles(ids: (number | string)[]) {
  return request.post('/articles/batch-delete', { ids }).then((r) => r.data)
}

/** 管理端：更新状态（上架/下架等） */
export function updateArticleStatus(id: number | string, status: number) {
  return request.patch(`/articles/${id}/status`, { status }).then((r) => r.data)
}

/** 管理端：置顶切换 */
export function updateArticlePin(id: number | string, is_pinned: boolean) {
  return request.patch(`/articles/${id}/pin`, { is_pinned }).then((r) => r.data)
}

/* ====================== 前台：互动（点赞/收藏/评论） ====================== */

/** 点赞 */
export function likeArticle(id: number | string) {
  return request.post(`/blog/articles/${id}/like`).then((r) => r.data)
}

/** 取消点赞 */
export function unlikeArticle(id: number | string) {
  return request.delete(`/blog/articles/${id}/like`).then((r) => r.data)
}

/** 收藏 */
export function collectArticle(id: number | string) {
  return request.post(`/blog/articles/${id}/collect`).then((r) => r.data)
}

/** 取消收藏 */
export function uncollectArticle(id: number | string) {
  return request.delete(`/blog/articles/${id}/collect`).then((r) => r.data)
}

/** 评论列表 */
export function getArticleComments(id: number | string, params: { page?: number; limit?: number } = {}) {
  return request.get(`/blog/articles/${id}/comments`, { params }).then((r) => r.data)
}

/** 发表评论（支持 reply: parent_id / reply_to_user_id） */
export function addComment(data: {
  article_id: number | string
  content: string
  parent_id?: number | string
  reply_to_user_id?: number | string
}) {
  return request.post(`/blog/articles/${data.article_id}/comments`, data).then((r) => r.data)
}

/** 删除评论（作者或管理员） */
export function deleteComment(id: number | string) {
  return request.delete(`/blog/comments/${id}`).then((r) => r.data)
}
