import { useMemo } from 'react'
import { UserCircle2 } from 'lucide-react'

const COLORS = [
  'var(--accent-primary)',
  'var(--accent-warm)',
  'var(--color-leaf-500)',
  'var(--color-leaf-700)',
  'var(--color-warm-600)',
  'var(--color-slate-600)',
]

function pickColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

export default function EmptyAvatar({
  name = '',
  avatar,
  size = 40,
}: {
  name?: string
  avatar?: string
  size?: number
}) {
  const initial = useMemo(() => {
    const n = (name || '').trim()
    if (!n) return ''
    // 中文取首字，英文取首字母大写
    const c = Array.from(n)[0] || ''
    return /[a-zA-Z]/.test(c) ? c.toUpperCase() : c
  }, [name])

  const color = useMemo(() => pickColor(name || 'guest'), [name])

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
  }

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || 'avatar'}
        style={style}
        className="object-cover border"
        onError={(e) => {
          (e.target as any).style.display = 'none'
        }}
      />
    )
  }

  const bg = initial
    ? `color-mix(in srgb, ${color} 22%, transparent)`
    : 'var(--bg-surface-alt)'
  const fg = initial ? color : 'var(--text-muted)'

  return (
    <div
      style={{ ...style, background: bg, color: fg }}
      className="flex items-center justify-center overflow-hidden border"
    >
      {initial ? (
        <span className="font-semibold select-none" style={{ fontSize: Math.max(12, size * 0.4) }}>
          {initial}
        </span>
      ) : (
        <UserCircle2 size={Math.max(16, size * 0.55)} />
      )}
    </div>
  )
}
