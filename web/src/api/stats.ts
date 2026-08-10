import request from './request'

/** 前台：站点统计 */
export function getStats() {
  return request.get('/blog/stats').then((r) => r.data)
}

/** 前台：热门文章 */
export function getHotArticles() {
  return request.get('/blog/stats/hot-articles').then((r) => r.data)
}

/** 管理端：统计 */
export function getAdminStats() {
  return request.get('/stats').then((r) => r.data)
}
/** 管理端：数据分析 - 近 7 天访问 */
export function get7DaysVisits() {
  return request.get('/analytics/visits/7days').then((r) => r.data)
}
/** 管理端：在线用户 */
export function getOnlineUsers() {
  return request.get('/analytics/online/users').then((r) => r.data)
}
/** 管理端：实时访问 */
export function getRealtimeVisits() {
  return request.get('/analytics/visits/realtime').then((r) => r.data)
}
