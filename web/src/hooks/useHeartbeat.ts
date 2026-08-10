import { useEffect, useRef } from 'react'
import { heartbeat } from '@/api/blog'

/**
 * 心跳上报：和 Vue 端 useHeartbeat 一致
 * 30 秒发一次，组件卸载停止
 */
export function useHeartbeat(enabled = true) {
  const timer = useRef<number | null>(null)
  useEffect(() => {
    if (!enabled) return
    const tick = async () => {
      try {
        await heartbeat({ path: location.pathname })
      } catch {}
    }
    tick()
    timer.current = window.setInterval(tick, 30_000)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [enabled])
}
