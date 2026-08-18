import request from './request'

/** 前台：博主信息（关于页） */
export function getBloggerInfo() {
  return request.get('/blog/blogger').then((r) => r.data)
}
