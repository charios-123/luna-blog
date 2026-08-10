import request from './request'

/** 获取当前用户详细信息 */
export function getUserInfo() {
  return request.get('/blog/auth/me').then((r) => r.data).catch(() => null)
}

/** 更新用户资料 */
export function updateUserProfile(data: Record<string, any>) {
  return request.put('/blog/auth/profile', data).then((r) => r.data)
}

/** 修改密码 */
export function changePassword(data: { old_password: string; new_password: string }) {
  return request.put('/blog/auth/password', data).then((r) => r.data)
}

/** 更新博主资料（About 页展示用） */
export function updateBloggerInfo(data: Record<string, any>) {
  return request.put('/blog/blogger', data).then((r) => r.data)
}

/** 获取博主资料 */
export function getBloggerInfo() {
  return request.get('/blog/blogger').then((r) => r.data).catch(() => null)
}

/** 上传文件（头像等） */
export function uploadFile(file: File, folder = 'avatars') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  return request
    .post('/files/upload', formData)
    .then((r) => r.data)
}
