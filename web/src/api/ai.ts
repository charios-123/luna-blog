import request from './request'

export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** 前台：基于文章内容的 AI 问答 */
export function aiChatAboutArticle(id: number | string, messages: AIChatMessage[]) {
  // AI 生成较慢，放宽超时到 90s
  return request
    .post(`/blog/articles/${id}/ai/chat`, { messages }, { timeout: 90000 })
    .then((r) => r.data)
}
