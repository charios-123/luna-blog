import { useEffect, useRef } from 'react'
import { recordVisitDuration } from '@/api/blog'

/**
 * 访问时长上报：页面进入时记录 start，离开时（beforeunload + visibilitychange hidden）上报
 */
export function useVisitTracking() {
  const startRef = useRef<number>(Date.now())
  const pathRef = useRef<string>(location.pathname)

  const send = () => {
    const duration = Date.now() - startRef.current
    const path = pathRef.current
    if (duration > 0 && duration < 1000 * 60 * 60 * 6) {
      try {
        navigator.sendBeacon
          ? navigator.sendBeacon(
              (import.meta.env.VITE_API_BASE_URL || '/api') + '/blog/visit',
              JSON.stringify({ duration, path }),
            )
          : recordVisitDuration({ duration, path }).catch(() => {})
      } catch {}
    }
    startRef.current = Date.now()
    pathRef.current = location.pathname
  }

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') send()
    }
    const onBeforeUnload = () => send()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
      send()
    }
  }, [])
}
