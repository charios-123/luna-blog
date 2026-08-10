import request from './request'

// 留言板列表
export function getGuestbook(params?: { page?: number; limit?: number }) {
  return request.get('/guestbook', { params }).catch(() => ({ list: [] }))
}

// 新增留言
export function addGuestbook(data: {
  content: string
  parent_id?: any
  reply_to_user_id?: any
  nickname?: string
  email?: string
}) {
  return request.post('/guestbook', data)
}

// 删除留言（作者 / 管理员）
export function deleteGuestbook(id: any) {
  return request.delete(`/guestbook/${id}`)
}
