import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Sparkles, TrendingUp, Clock, BookOpen, MessageCircle, Hash, FolderTree, Pin } from 'lucide-react'
import ArticleCard from '@/components/ArticleCard'
import Spinner from '@/components/ui/Spinner'
import { getArticles } from '@/api/article'
import { getStats } from '@/api/stats'
import { getCategories, getTags } from '@/api/tag'
import { fromNow } from '@/lib/utils'

export default function Home() {
  // 首页最新文章（前 6 篇）
  const latestQ = useQuery({
    queryKey: ['home', 'latest'],
    queryFn: () => getArticles({ page: 1, limit: 6 }).catch(() => ({ list: [], total: 0 })),
  })
  const statsQ = useQuery({
    queryKey: ['home', 'stats'],
    queryFn: () => getStats().catch(() => ({
      article_count: 0, category_count: 0, tag_count: 0, comment_count: 0, total_view_count: 0, user_count: 0,
    })),
  })
  const catsQ = useQuery({
    queryKey: ['home', 'categories'],
    queryFn: () => getCategories().catch(() => ([])),
  })
  const tagsQ = useQuery({
    queryKey: ['home', 'tags'],
    queryFn: () => getTags().catch(() => ([])),
  })

  const latest = (latestQ.data?.list as any[]) || []
  const pinned = latest.filter((a) => a.is_pinned)
  const nonPinned = latest.filter((a) => !a.is_pinned)
  const stats = statsQ.data as any
  const categories = (catsQ.data as any[]) || []
  const tags = (tagsQ.data as any[]) || []

  return (
    <div className="animate-[fade-up_0.4s_ease-out]">
      {/* Hero */}
      <section
        className="relative overflow-hidden card p-8 md:p-12 mb-10"
        style={{
          borderRadius: 'var(--radius-xl)',
          background:
            'radial-gradient(700px 280px at 100% 0%, color-mix(in srgb, var(--color-leaf-400) 22%, transparent), transparent 60%), radial-gradient(500px 260px at 0% 100%, color-mix(in srgb, var(--color-leaf-600) 16%, transparent), transparent 60%), var(--bg-surface)',
        }}
      >
        <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          <div className="lg:col-span-3 space-y-5 animate-[fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)]">
            <span className="inline-flex items-center gap-1.5 chip" style={{
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              color: 'var(--accent-primary)',
            }}>
              <Sparkles size={14} />
              运维工程师的技术笔记
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-heading)' }}>
              记录每一次探索，<br />
              <span style={{ color: 'var(--accent-primary)' }}>沉淀技术路上的思考</span>
            </h1>
            <p className="text-base md:text-lg max-w-xl" style={{ color: 'var(--text-muted)' }}>
              这里是运维/开发相关的技术笔记，涉及 Linux、K8s、自动化、后端开发等话题。
              欢迎交流，也欢迎指出错误。
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/articles" className="btn btn-primary !px-5 !py-2.5">
                <BookOpen size={17} />
                浏览文章
              </Link>
              <Link to="/guestbook" className="btn btn-outline !px-5 !py-2.5">
                <MessageCircle size={17} />
                留言板
              </Link>
              <Link to="/about" className="btn btn-ghost !px-5 !py-2.5">
                关于我 →
              </Link>
            </div>
          </div>

          {/* Stats tiles */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3 animate-[fade-up_0.7s_cubic-bezier(0.22,1,0.36,1)]">
            <StatTile icon={<BookOpen size={18} />} label="文章" value={stats?.article_count ?? 0} />
            <StatTile icon={<Hash size={18} />} label="标签" value={stats?.tag_count ?? 0} />
            <StatTile icon={<FolderTree size={18} />} label="分类" value={stats?.category_count ?? 0} />
            <StatTile icon={<MessageCircle size={18} />} label="评论" value={stats?.comment_count ?? 0} />
          </div>
        </div>
      </section>

      {/* 置顶 + 最新 */}
      <div className="space-y-6">
        {pinned.length > 0 && (
          <>
            <SectionTitle icon={<Pin size={18} />} title="置顶推荐" to="/articles" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {pinned.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </>
        )}

        <SectionTitle icon={<Clock size={18} />} title="最新文章" to="/articles" more="查看全部" />
        {(latestQ.isFetching && !latestQ.data) ? (
          <div className="card p-10 flex items-center justify-center" style={{ borderRadius: 'var(--radius-xl)' }}>
            <Spinner />
          </div>
        ) : nonPinned.length === 0 && pinned.length === 0 ? (
          <EmptyArticles />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {nonPinned.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>

      {/* 分类 + 标签 + 最近更新 横向排列 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
        <div className="card p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <FolderTree size={16} style={{ color: 'var(--accent-primary)' }} />
            文章分类
          </h3>
          {catsQ.isFetching && !catsQ.data ? <Spinner size="sm" /> : (
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 && <span className="text-sm" style={{ color: 'var(--text-subtle)' }}>暂无分类</span>}
              {categories.map((c: any) => (
                <Link key={c.id} to={`/articles?category_id=${c.id}`} className="chip">
                  {c.name}
                  {typeof c.article_count === 'number' && <span className="ml-1 opacity-60">({c.article_count})</span>}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <Hash size={16} style={{ color: 'var(--accent-primary)' }} />
            热门标签
          </h3>
          {tagsQ.isFetching && !tagsQ.data ? <Spinner size="sm" /> : (
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 && <span className="text-sm" style={{ color: 'var(--text-subtle)' }}>暂无标签</span>}
              {tags.map((t: any) => (
                <Link
                  key={t.id}
                  to={`/articles?tag_id=${t.id}`}
                  className="chip"
                  style={t.color ? ({ background: `color-mix(in srgb, ${t.color} 16%, transparent)`, color: t.color }) : {}}
                >
                  #{t.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <TrendingUp size={16} style={{ color: 'var(--accent-primary)' }} />
            最近更新
          </h3>
          <ul className="space-y-3">
            {latest.slice(0, 5).map((a: any) => (
              <li key={a.id}>
                <Link to={`/articles/${a.id}`} className="group flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent-primary)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-fg)' }}>
                      {a.title}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
                      {fromNow(a.created_at)} · {a.view_count ?? 0} 阅读
                    </div>
                  </div>
                </Link>
              </li>
            ))}
            {latest.length === 0 && <li className="text-sm" style={{ color: 'var(--text-subtle)' }}>暂无内容</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({
  icon, title, to, more,
}: {
  icon?: React.ReactNode
  title: string
  to?: string
  more?: string
}) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="section-title !mb-0 !border-0 !pb-0 !relative flex items-center gap-2.5"
          style={{ color: 'var(--text-heading)' }}>
        <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
        {title}
      </h2>
      {to && (
        <Link to={to} className="text-sm font-medium inline-flex items-center gap-1 group" style={{ color: 'var(--accent-primary)' }}>
          {more || '更多'}
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      )}
    </div>
  )
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div
      className="p-4 rounded-[var(--radius-lg)] border"
      style={{
        background: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
        {value}
      </div>
    </div>
  )
}

function EmptyArticles() {
  return (
    <div className="card p-10 text-center" style={{ borderRadius: 'var(--radius-xl)' }}>
      <div className="text-4xl mb-3 opacity-70">📝</div>
      <h3 className="font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>暂无文章</h3>
      <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>作者正在准备中，敬请期待～</p>
    </div>
  )
}
