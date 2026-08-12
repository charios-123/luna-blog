/**
 * 轻量 toast 封装（后续可替换为 shadcn/toast 或 Sonner）
 */
import { useState, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'
interface ToastItem {
  id: number
  type: ToastType
  message: string
}

let idSeed = 0
const listeners = new Set<(items: ToastItem[]) => void>()
const items: ToastItem[] = []

function emit() {
  listeners.forEach((fn) => fn([...items]))
}

export function useToasts() {
  const [list, setList] = useState<ToastItem[]>([...items])
  useEffect(() => {
    const fn = (next: ToastItem[]) => setList(next)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])
  return list
}

export const toast = {
  show(type: ToastType, message: string, duration = 2600) {
    const id = ++idSeed
    items.push({ id, type, message })
    emit()
    setTimeout(() => {
      const idx = items.findIndex((i) => i.id === id)
      if (idx >= 0) items.splice(idx, 1)
      emit()
    }, duration)
  },
  success: (m: string) => toast.show('success', m),
  error:   (m: string) => toast.show('error', m),
  warning: (m: string) => toast.show('warning', m),
  info:    (m: string) => toast.show('info', m),
}

/**
 * 简易 Toaster 组件。要放在 layout 顶层。
 * 后续可替换为 shadcn-ui 的 Toaster。
 */
export function Toaster() {
  const list = (useToasts as any)() as ToastItem[]
  const colors: Record<ToastType, string> = {
    success: 'bg-[var(--accent-primary)] text-white',
    error:   'bg-[var(--accent-danger)] text-white',
    warning: 'bg-[var(--accent-warm)] text-white',
    info:    'bg-[var(--color-slate-800)] text-white',
  }
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-72 pointer-events-none">
      {list.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-[var(--radius-md)] text-sm shadow-lg animate-[fade-down_0.25s_ease-out] ${colors[t.type]}`}
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
