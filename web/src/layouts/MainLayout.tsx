import { Outlet, useLocation } from 'react-router-dom'
import { Moon } from 'lucide-react'
import Header from '@/components/Header'
import GlobalSidebar from '@/components/GlobalSidebar'
import { Toaster } from '@/components/toast'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import { useVisitTracking } from '@/hooks/useVisitTracking'

export default function MainLayout() {
  useHeartbeat(true)
  useVisitTracking()
  const { pathname } = useLocation()
  // 文章详情页：隐藏左右侧栏，让文章内容更宽
  const isArticleDetail = /^\/articles\/\d+/.test(pathname)
  // 后台管理页：隐藏左右侧栏,只保留管理区域(AdminLayout 自带导航)
  const isAdmin = pathname.startsWith('/admin')

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* 科技感背景连线 */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5eb579" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#3a9a5b" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#5eb579" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <line x1="15%" y1="25%" x2="35%" y2="60%" stroke="url(#line-gradient)" strokeWidth="1" filter="url(#glow)">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" repeatCount="indefinite" />
          </line>
          <line x1="35%" y1="60%" x2="55%" y2="15%" stroke="url(#line-gradient)" strokeWidth="1" filter="url(#glow)">
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3.5s" repeatCount="indefinite" />
          </line>
          <line x1="55%" y1="15%" x2="75%" y2="45%" stroke="url(#line-gradient)" strokeWidth="1" filter="url(#glow)">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="5s" repeatCount="indefinite" />
          </line>
          <line x1="75%" y1="45%" x2="90%" y2="75%" stroke="url(#line-gradient)" strokeWidth="1" filter="url(#glow)">
            <animate attributeName="opacity" values="0.4;0.3;0.4" dur="4.5s" repeatCount="indefinite" />
          </line>
          <line x1="90%" y1="75%" x2="25%" y2="85%" stroke="url(#line-gradient)" strokeWidth="1" filter="url(#glow)">
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
          </line>
          <line x1="25%" y1="85%" x2="65%" y2="35%" stroke="url(#line-gradient)" strokeWidth="1" filter="url(#glow)">
            <animate attributeName="opacity" values="0.5;0.3;0.5" dur="4s" repeatCount="indefinite" />
          </line>
          <line x1="65%" y1="35%" x2="45%" y2="90%" stroke="url(#line-gradient)" strokeWidth="1" filter="url(#glow)">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3.8s" repeatCount="indefinite" />
          </line>
          <circle cx="15%" cy="25%" r="3" fill="#5eb579" filter="url(#glow)">
            <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="35%" cy="60%" r="2" fill="#3a9a5b" filter="url(#glow)">
            <animate attributeName="r" values="2;4;2" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="55%" cy="15%" r="3" fill="#5eb579" filter="url(#glow)">
            <animate attributeName="r" values="3;4.5;3" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="75%" cy="45%" r="2" fill="#3a9a5b" filter="url(#glow)">
            <animate attributeName="r" values="2;4;2" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="90%" cy="75%" r="2.5" fill="#5eb579" filter="url(#glow)">
            <animate attributeName="r" values="2.5;4.5;2.5" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="25%" cy="85%" r="2" fill="#3a9a5b" filter="url(#glow)">
            <animate attributeName="r" values="2;3.5;2" dur="2.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="65%" cy="35%" r="2.5" fill="#5eb579" filter="url(#glow)">
            <animate attributeName="r" values="2.5;4;2.5" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="45%" cy="90%" r="2" fill="#3a9a5b" filter="url(#glow)">
            <animate attributeName="r" values="2;3.5;2" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      {/* 飘浮叶子装饰 */}
      <div className="floating-leaves" aria-hidden="true">
        {[
          { left: '10%', delay: '0s', dur: '18s', size: 20, fill: 'var(--color-leaf-400)', stroke: 'var(--color-leaf-500)' },
          { left: '25%', delay: '3s', dur: '22s', size: 16, fill: 'var(--color-leaf-300)', stroke: 'var(--color-leaf-400)' },
          { left: '45%', delay: '6s', dur: '16s', size: 24, fill: 'var(--color-leaf-500)', stroke: 'var(--color-leaf-600)' },
          { left: '65%', delay: '2s', dur: '20s', size: 18, fill: 'var(--color-leaf-300)', stroke: 'var(--color-leaf-400)' },
          { left: '80%', delay: '8s', dur: '24s', size: 22, fill: 'var(--color-leaf-400)', stroke: 'var(--color-leaf-500)' },
          { left: '92%', delay: '4s', dur: '19s', size: 14, fill: 'var(--color-leaf-200)', stroke: 'var(--color-leaf-300)' },
        ].map((m, i) => (
          <svg key={i} className="floating-leaf" style={{ left: m.left, animationDelay: m.delay, animationDuration: m.dur }} width={m.size} height={m.size} viewBox="0 0 20 20">
            <path d="M10 2 C4 6 4 14 10 18 C16 14 16 6 10 2" fill={m.fill} />
            <line x1="10" y1="4" x2="10" y2="17" stroke={m.stroke} strokeWidth="1" />
          </svg>
        ))}
      </div>

      <Header />

      {/* 导航与内容之间的波浪过渡 */}
      <div className="nav-wave-wrapper" aria-hidden="true">
        <div className="nav-wave">
          <svg className="wave-1" viewBox="0 0 2400 120" preserveAspectRatio="none">
            <path
              d="M0,60 C400,0 800,120 1200,60 C1600,0 2000,120 2400,60 L2400,120 L0,120 Z"
              fill="var(--color-leaf-200)"
            />
          </svg>
          <svg className="wave-2" viewBox="0 0 2400 120" preserveAspectRatio="none">
            <path
              d="M0,80 C300,40 700,100 1100,80 C1500,60 1900,100 2400,80 L2400,120 L0,120 Z"
              fill="var(--color-leaf-300)"
            />
          </svg>
        </div>
      </div>

      <main className="flex-1 w-full relative z-10">
        {isArticleDetail || isAdmin ? (
          /* 文章详情页 / 后台管理页:无侧栏,内容居中 */
          <div className="w-full flex gap-6 px-[90px] py-8 max-w-[2000px] mx-auto">
            <div className="flex-1 min-w-0">
              <Outlet />
            </div>
          </div>
        ) : (
          /* 普通页面：左右侧栏 + 中间内容 */
          <div className="w-full flex gap-6 px-[90px] py-8 max-w-[2000px] mx-auto">
            {/* 左侧栏：博主名片 + 统计 */}
            <aside className="hidden xl:flex flex-col w-[280px] shrink-0 sticky top-24 self-start space-y-5">
              <GlobalSidebar side="left" />
            </aside>
            {/* 中间内容区：铺满剩余宽度 */}
            <div className="flex-1 min-w-0">
              <Outlet />
            </div>
            {/* 右侧栏：天气 + 日历 + 最新动态 */}
            <aside className="hidden xl:flex flex-col w-72 shrink-0 sticky top-24 self-start space-y-5">
              <GlobalSidebar side="right" />
            </aside>
          </div>
        )}
      </main>
      <Footer />
      <Toaster />
    </div>
  )
}

function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer
      className="mt-16 border-t w-full"
      style={{
        borderColor: 'var(--border-muted)',
        background: 'var(--bg-surface)',
      }}
    >
      <div className="container-page py-10 flex items-center justify-center text-sm" style={{ color: 'var(--text-subtle)' }}>
        <div className="flex items-center gap-2">
          <Moon size={16} fill="currentColor" style={{ color: 'var(--accent-primary)' }} />
          <span>© {year} Luna Blog · 用心记录</span>
        </div>
      </div>
    </footer>
  )
}
