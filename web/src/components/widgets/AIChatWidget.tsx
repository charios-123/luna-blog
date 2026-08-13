import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles, Eraser, User as UserIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { aiChatAboutArticleStream, type AIChatMessage } from '@/api/ai'
import Spinner from '@/components/ui/Spinner'

const SUGGESTIONS = [
  '总结这篇文章的要点',
  '这篇文章讲了什么？',
  '文中有哪些关键概念？',
]

export default function AIChatWidget({ articleId }: { articleId: number | string }) {
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // 切换文章时清空对话
  useEffect(() => {
    setMessages([])
    setInput('')
  }, [articleId])

  // 组件卸载时中断进行中的流式请求
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // 增量追加到最后一条 assistant 消息,实现打字机效果
  const appendToLastAssistant = (text: string) => {
    setMessages((prev) => {
      const next = prev.slice()
      const last = next[next.length - 1]
      if (last && last.role === 'assistant') {
        next[next.length - 1] = { ...last, content: last.content + text }
      }
      return next
    })
  }

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const history: AIChatMessage[] = [...messages, { role: 'user', content }]
    // 先插入空白的 assistant 占位,流式内容逐步填入
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)
    abortRef.current = new AbortController()
    let receivedAny = false
    try {
      await aiChatAboutArticleStream(
        articleId,
        history,
        {
          onContent: (chunk) => {
            receivedAny = true
            appendToLastAssistant(chunk)
          },
          onError: (msg) => {
            receivedAny = true
            appendToLastAssistant(msg)
          },
          onDone: () => {},
        },
        abortRef.current.signal,
      )
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        appendToLastAssistant(e?.message || 'AI 服务暂时不可用，请稍后再试。')
      }
    } finally {
      // 流结束后,若 assistant 仍为空则给出兜底提示
      setMessages((prev) => {
        const next = prev.slice()
        const last = next[next.length - 1]
        if (last && last.role === 'assistant' && !last.content && receivedAny === false) {
          next[next.length - 1] = { ...last, content: '抱歉，我没有获取到有效回答。' }
        }
        return next
      })
      setLoading(false)
      abortRef.current = null
    }
  }

  return (
    <div className="card p-4 flex flex-col" style={{ borderRadius: 'var(--radius-lg)', height: '560px' }}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
        <span className="font-semibold text-sm flex-1" style={{ color: 'var(--text-heading)' }}>文章 AI 问答</span>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="p-1 rounded hover:bg-[var(--bg-surface-alt)]"
            title="清空对话"
            style={{ color: 'var(--text-subtle)' }}
          >
            <Eraser size={13} />
          </button>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="text-xs leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
            <p>你好，我是这篇文章的 AI 助手。可以问我关于本文内容的任何问题，例如：</p>
            <div className="mt-2 space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-fg)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && (
              <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-leaf-500) 15%, transparent)', color: 'var(--color-leaf-600)' }}>
                <Bot size={13} />
              </span>
            )}
            <div
              className={`max-w-[82%] px-3 py-2 text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'whitespace-pre-wrap rounded-2xl rounded-br-sm'
                  : 'rounded-2xl rounded-bl-sm'
              }`}
              style={
                m.role === 'user'
                  ? { background: 'var(--accent-primary)', color: '#fff' }
                  : { background: 'var(--bg-surface-alt)', color: 'var(--text-fg)' }
              }
            >
              {m.role === 'user' ? (
                m.content
              ) : (
                <div className="ai-chat-markdown markdown-body">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[[rehypeHighlight, { detect: true }]]}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            {m.role === 'user' && (
              <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-muted)' }}>
                <UserIcon size={13} />
              </span>
            )}
          </div>
        ))}

        {loading && !messages[messages.length - 1]?.content && (
          <div className="flex gap-2">
            <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-leaf-500) 15%, transparent)', color: 'var(--color-leaf-600)' }}>
              <Bot size={13} />
            </span>
            <div className="px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-2" style={{ background: 'var(--bg-surface-alt)' }}>
              <Spinner size="sm" />
              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>AI 正在思考…</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="input-base flex-1 min-w-0 px-3 py-2 text-sm"
          placeholder="输入你的问题…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="btn btn-primary !py-2 px-3 inline-flex items-center gap-1.5"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
