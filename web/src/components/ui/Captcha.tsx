import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

interface CaptchaProps {
  onCodeChange?: (code: string) => void
  width?: number
  height?: number
  length?: number
}

export interface CaptchaHandle {
  refresh: () => void
  validate: (input: string) => boolean
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉易混淆字符 I O 0 1

function randomColor(min: number, max: number) {
  const r = Math.floor(Math.random() * (max - min) + min)
  const g = Math.floor(Math.random() * (max - min) + min)
  const b = Math.floor(Math.random() * (max - min) + min)
  return `rgb(${r},${g},${b})`
}

const Captcha = forwardRef<CaptchaHandle, CaptchaProps>(function Captcha(
  { onCodeChange, width = 120, height = 40, length = 4 },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const codeRef = useRef<string>('')

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 生成随机码
    let code = ''
    for (let i = 0; i < length; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)]
    }
    codeRef.current = code
    onCodeChange?.(code)

    // 背景
    ctx.fillStyle = '#f1f4f6'
    ctx.fillRect(0, 0, width, height)

    // 绘制字符
    const charWidth = width / (length + 1)
    for (let i = 0; i < length; i++) {
      ctx.save()
      const fontSize = Math.floor(Math.random() * 6) + 22
      ctx.font = `bold ${fontSize}px "Inter", "Arial", sans-serif`
      ctx.fillStyle = randomColor(40, 120)
      const x = charWidth * (i + 0.5) + (Math.random() * 6 - 3)
      const y = height / 2 + fontSize / 3 + (Math.random() * 4 - 2)
      ctx.translate(x, y)
      ctx.rotate((Math.random() * 30 - 15) * Math.PI / 180)
      ctx.fillText(code[i], 0, 0)
      ctx.restore()
    }

    // 干扰线
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = randomColor(120, 180)
      ctx.lineWidth = Math.random() * 1.5 + 0.5
      ctx.beginPath()
      ctx.moveTo(Math.random() * width, Math.random() * height)
      ctx.lineTo(Math.random() * width, Math.random() * height)
      ctx.stroke()
    }

    // 噪点
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = randomColor(100, 200)
      ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5)
    }
  }, [width, height, length, onCodeChange])

  useEffect(() => {
    draw()
  }, [draw])

  useImperativeHandle(ref, () => ({
    refresh: draw,
    validate: (input: string) => input.toUpperCase() === codeRef.current.toUpperCase(),
  }))

  return (
    <button
      type="button"
      onClick={draw}
      className="shrink-0 rounded-[var(--radius-md)] border overflow-hidden flex items-center gap-1.5 px-1.5 py-1 hover:border-[var(--accent-primary)] transition-colors"
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
      title="点击刷新验证码"
    >
      <canvas ref={canvasRef} width={width} height={height} className="rounded" />
      <RefreshCw size={13} style={{ color: 'var(--text-muted)' }} />
    </button>
  )
})

export default Captcha
