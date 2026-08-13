import { useQuery } from '@tanstack/react-query'
import { getStats as getBlogStats, getHotArticles, get7DaysVisits } from '@/api/stats'
import { getArticles } from '@/api/article'
import Spinner from '@/components/ui/Spinner'
import {
  BookOpen, Eye, MessageCircle, Hash, FolderTree, TrendingUp,
  CalendarHeart, Award, Clock4, Flame, BarChart3,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/utils'
import { userStore, selectIsLoggedIn } from '@/stores/user'

export default function Stats() {
  const isLoggedIn = userStore(selectIsLoggedIn)
  const statsQ = useQuery({
    queryKey: ['stats-page'],
    queryFn: () => getBlogStats().catch(() => ({})) as Promise<any>,
  })
  const hotQ = useQuery({
    queryKey: ['stats-hot-articles'],
    queryFn: () => getHotArticles().catch(() => ({})) as Promise<any>,
  })
  const visitsQ = useQuery({
    queryKey: ['stats-visits-7d'],
    queryFn: () => get7DaysVisits().catch(() => null) as Promise<any>,
  })
  const latestQ = useQuery({
    queryKey: ['stats-latest'],
    queryFn: () => getArticles({ page: 1, limit: 5 }).catch(() => ({ list: [] })) as Promise<any>,
  })

  const s: any = statsQ.data || {}
  const visits: any = visitsQ.data
  const hotList: any[] = Array.isArray(hotQ.data?.list)
    ? hotQ.data.list
    : Array.isArray(hotQ.data) ? hotQ.data : []
  const latestList: any[] = latestQ.data?.list || []

  const tiles = [
    { k: 'article_count', label: '文章总数', icon: <BookOpen size={20} />, accent: 'var(--accent-primary)' },
    { k: 'total_views', label: '总阅读', icon: <Eye size={20} />, accent: 'var(--accent-warm)' },
    { k: 'comment_count', label: '评论数', icon: <MessageCircle size={20} />, accent: 'var(--color-leaf-600)' },
    { k: 'category_count', label: '分类', icon: <FolderTree size={20} />, accent: 'var(--color-warm-600)' },
    { k: 'tag_count', label: '标签', icon: <Hash size={20} />, accent: 'var(--accent-primary)' },
    { k: 'user_count', label: '用户数', icon: <CalendarHeart size={20} />, accent: 'var(--color-leaf-500)' },
  ]

  return (
    <div className="space-y-8 animate-[fade-up_0.4s_ease-out]">
      <header className="animate-[fade-up_0.5s_ease-out]">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2.5" style={{ color: 'var(--text-heading)' }}>
          <BarChart3 size={26} style={{ color: 'var(--accent-primary)' }} />
          站点统计
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>看看这个小站的运行状况 🌱</p>
      </header>

      {/* Tiles */}
      {statsQ.isFetching && !statsQ.data ? (
        <div className="card p-14 flex justify-center" style={{ borderRadius: 'var(--radius-xl)' }}>
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {tiles.map((t) => (
            <div
              key={t.k}
              className="card card-hover p-5 animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)]"
              style={{ borderRadius: 'var(--radius-lg)' }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: `color-mix(in srgb, ${t.accent} 14%, transparent)`, color: t.accent }}
              >
                {t.icon}
              </div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>{t.label}</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
                {typeof s[t.k] === 'number' ? s[t.k].toLocaleString() : s[t.k] ?? '-'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 近 7 天访问趋势 */}
      <div className="card p-6 md:p-7 animate-[fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)]" style={{ borderRadius: 'var(--radius-xl)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
            近 7 天访问趋势
          </h3>
          {visits?.total_pv != null && (
            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              累计 <b style={{ color: 'var(--accent-primary)' }}>{visits.total_pv}</b> PV ·{' '}
              <b style={{ color: 'var(--accent-warm)' }}>{visits.total_uv}</b> UV
            </span>
          )}
        </div>
        {visitsQ.isFetching && !visitsQ.data ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !visits ? (
          <p className="text-sm py-10 text-center" style={{ color: 'var(--text-subtle)' }}>
            {isLoggedIn ? '暂无访问数据' : '登录后查看近 7 天访问趋势'}
          </p>
        ) : (visits.pv || []).every((n: number) => !n) ? (
          <p className="text-sm py-10 text-center" style={{ color: 'var(--text-subtle)' }}>暂无访问数据</p>
        ) : (
          <VisitTrendChart days={visits.dates || []} pv={visits.pv || []} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 热门文章 */}
        <div className="card p-6 md:p-7 animate-[fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)]" style={{ borderRadius: 'var(--radius-xl)' }}>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <Flame size={18} style={{ color: 'var(--accent-warm)' }} />
            热门文章 Top 10
          </h3>
          {hotQ.isFetching && !hotQ.data ? <Spinner /> : hotList.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--text-subtle)' }}>暂无数据</p>
          ) : (
            <ol className="space-y-1.5">
              {hotList.slice(0, 10).map((a, i) => (
                <li key={a.id}>
                  <Link
                    to={`/articles/${a.id}`}
                    className="group flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-surface-alt)] transition-colors"
                  >
                    <span
                      className="w-6 h-6 flex items-center justify-center shrink-0 rounded-full text-xs font-bold"
                      style={{
                        background: i < 3
                          ? `color-mix(in srgb, var(--accent-warm) 22%, transparent)`
                          : 'var(--bg-surface-alt)',
                        color: i < 3 ? 'var(--accent-warm)' : 'var(--text-muted)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0 truncate group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-fg)' }}>
                      {a.title || '（无标题）'}
                    </span>
                    <span className="text-xs shrink-0 inline-flex items-center gap-1" style={{ color: 'var(--text-subtle)' }}>
                      <Eye size={12} />
                      {a.view_count ?? 0}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* 最新发布 */}
        <div className="card p-6 md:p-7 animate-[fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)]" style={{ borderRadius: 'var(--radius-xl)' }}>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <Clock4 size={18} style={{ color: 'var(--accent-primary)' }} />
            最新发布
          </h3>
          {latestQ.isFetching && !latestQ.data ? <Spinner /> : latestList.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--text-subtle)' }}>暂无文章</p>
          ) : (
            <ol className="space-y-1.5">
              {latestList.map((a, i) => (
                <li key={a.id}>
                  <Link
                    to={`/articles/${a.id}`}
                    className="group flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-surface-alt)] transition-colors"
                  >
                    <span
                      className="w-6 h-6 flex items-center justify-center shrink-0 rounded-full text-xs"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0 truncate group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-fg)' }}>
                      {a.title || '（无标题）'}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-subtle)' }}>
                      {formatDate(a.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* 一句话统计 */}
      <div
        className="card p-7 md:p-8 text-center animate-[fade-up_0.65s_cubic-bezier(0.22,1,0.36,1)]"
        style={{
          borderRadius: 'var(--radius-xl)',
          background: 'radial-gradient(500px 200px at 50% 0%, color-mix(in srgb, var(--accent-primary) 18%, transparent), transparent 60%), var(--bg-surface)',
        }}
      >
        <Award size={28} className="mx-auto mb-3" style={{ color: 'var(--accent-warm)' }} />
        <p className="text-base md:text-lg" style={{ color: 'var(--text-heading)' }}>
          小站已发布 <b style={{ color: 'var(--accent-primary)' }}>{s.article_count ?? 0}</b> 篇文章，
          累计 <b style={{ color: 'var(--accent-primary)' }}>{(s.total_views ?? 0).toLocaleString?.() ?? s.total_views ?? 0}</b> 次阅读，
          <br className="hidden md:block" />
          收到 <b style={{ color: 'var(--accent-primary)' }}>{s.comment_count ?? 0}</b> 条留言。
          感谢每一位路过的朋友 ❤️
        </p>
      </div>
    </div>
  )
}

// 近 7 天访问趋势图（轻量 SVG 柱状图，不引入图表库）
function VisitTrendChart({ days, pv }: { days: string[]; pv: number[] }) {
  const W = 720
  const H = 210
  const padT = 26
  const padB = 36
  const innerH = H - padT - padB
  const maxPV = Math.max(...pv, 1)
  const barW = 34
  const gap = days.length > 1 ? (W - 24 - days.length * barW) / (days.length - 1) : 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 230 }}>
      {days.map((d, i) => {
        const n = pv[i] || 0
        const bh = n > 0 ? Math.max((n / maxPV) * innerH, 4) : 2
        const x = 12 + i * (barW + gap)
        const y = padT + innerH - bh
        const isToday = i === days.length - 1
        const color = isToday ? 'var(--accent-warm)' : 'var(--accent-primary)'
        return (
          <g key={d}>
            <rect x={x} y={y} width={barW} height={bh} rx={5} fill={color} opacity={isToday ? 1 : 0.7}>
              <title>{`${d} · ${n} 次访问`}</title>
            </rect>
            <text x={x + barW / 2} y={y - 7} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
              {n > 0 ? n : ''}
            </text>
            <text x={x + barW / 2} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--text-subtle)">
              {d.slice(5)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
