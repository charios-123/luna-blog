export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIStreamHandlers {
  onContent: (chunk: string) => void
  onDone: () => void
  onError: (message: string) => void
}

/**
 * 前台：基于文章内容的 AI 问答（SSE 流式）
 * 后端按 text/event-stream 逐段返回增量内容,这里用 fetch 读取并解析
 */
export function aiChatAboutArticleStream(
  id: number | string,
  messages: AIChatMessage[],
  handlers: AIStreamHandlers,
  signal?: AbortSignal,
) {
  return fetch(`/api/blog/articles/${id}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ messages }),
    signal,
  }).then(async (res) => {
    if (!res.ok || !res.body) {
      throw new Error(`AI 服务请求失败(HTTP ${res.status})`)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      // SSE 事件以空行分隔,按 \n\n 切分解析
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        parseSSEEvent(raw, handlers)
      }
    }
    if (buffer.trim()) parseSSEEvent(buffer, handlers)
  })
}

/** 解析单个 SSE 帧(取 data: 行,按约定 JSON 解析) */
function parseSSEEvent(raw: string, handlers: AIStreamHandlers) {
  const dataLine = raw
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('data:'))
  if (!dataLine) return
  const data = dataLine.slice(5).trim()
  if (!data || data === '[DONE]') return
  try {
    const ev = JSON.parse(data)
    if (ev.type === 'content' && ev.content) {
      handlers.onContent(ev.content)
    } else if (ev.type === 'error') {
      handlers.onError(ev.message || 'AI 服务暂时不可用，请稍后再试。')
    } else if (ev.type === 'done') {
      handlers.onDone()
    }
  } catch {
    // 忽略无法解析的帧
  }
}
