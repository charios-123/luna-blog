import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles, Eraser, User as UserIcon } from 'lucide-react'
import { aiChatAboutArticle, type AIChatMessage } from '@/api/ai'
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

  // 切换文章时清空对话
  useEffect(() => {
    setMessages([])
    setInput('')
  }, [articleId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const next: AIChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res: any = await aiChatAboutArticle(articleId, next)
      const reply = res?.reply || ''
      setMessages((prev) => [...prev, { role: 'assistant', content: reply || '抱歉，我没有获取到有效回答。' }])
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: e?.message || 'AI 服务暂时不可用，请稍后再试。' }])
    } finally {
      setLoading(false)
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
              className={`max-w-[82%] px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                m.role === 'user' ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'
              }`}
              style={
                m.role === 'user'
                  ? { background: 'var(--accent-primary)', color: '#fff' }
                  : { background: 'var(--bg-surface-alt)', color: 'var(--text-fg)' }
              }
            >
              {m.content}
            </div>
            {m.role === 'user' && (
              <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-muted)' }}>
                <UserIcon size={13} />
              </span>
            )}
          </div>
        ))}

        {loading && (
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
