import request from './request'

// 留言板列表
export function getGuestbook(params?: { page?: number; limit?: number }) {
  return request.get('/blog/guestbook', { params }).then((r) => r.data).catch(() => ({ list: [] }))
}

// 新增留言
export function addGuestbook(data: {
  content: string
  parent_id?: any
  reply_to_user_id?: any
  nickname?: string
  email?: string
}) {
  return request.post('/blog/guestbook', data).then((r) => r.data)
}

// 删除留言（作者 / 管理员）
export function deleteGuestbook(id: any) {
  return request.delete(`/blog/guestbook/${id}`).then((r) => r.data)
}
