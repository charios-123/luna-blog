import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'ok' | 'error'
  duration?: number
  onClose?: () => void
}

/**
 * 轻量内联 Toast 组件（页面级，非全局）
 * 用于表单提交后的即时反馈
 */
export default function Toast({ message, type = 'ok', duration = 2600, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)

  const close = useCallback(() => {
    setVisible(false)
    onClose?.()
  }, [onClose])

  useEffect(() => {
    const t = setTimeout(close, duration)
    return () => clearTimeout(t)
  }, [duration, close])

  if (!visible) return null

  const isError = type === 'error'
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-lg)] shadow-lg animate-[fade-up_0.3s_ease-out]"
      style={{
        background: isError ? 'var(--accent-danger)' : 'var(--accent-primary)',
        color: 'white',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '90vw',
      }}
    >
      {isError ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={close} className="ml-1 p-0.5 rounded hover:bg-white/20 transition-colors">
        <X size={14} />
      </button>
    </div>
  )
}
