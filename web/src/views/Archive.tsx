import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getArchive } from '@/api/article'
import Spinner from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { Calendar, BookOpen } from 'lucide-react'

interface ArchiveGroup {
  year: number
  month: number
  label: string // "2026年3月"
  list: any[]
}

function groupByMonth(list: any[]): ArchiveGroup[] {
  const map = new Map<string, ArchiveGroup>()
  list.forEach((a) => {
    const d = new Date(a.created_at)
    if (isNaN(d as any)) return
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!map.has(key)) {
      map.set(key, {
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
        list: [],
      })
    }
    map.get(key)!.list.push(a)
  })
  return Array.from(map.values()).sort((a, b) =>
    a.year === b.year ? b.month - a.month : b.year - a.year,
  )
}

export default function Archive() {
  const q = useQuery({
    queryKey: ['archive'],
    queryFn: () => getArchive().catch(() => [] as any[]),
  })

  const raw = q.data as any
  // 后端可能返回 { list, groups } 或直接数组，兼容
  const arr: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.list)
      ? raw.list
      : Array.isArray(raw?.groups)
        ? (raw.groups as any[]).flatMap((g: any) => g.list || [])
        : []

  const groups = groupByMonth(arr)

  return (
    <div className="animate-[fade-up_0.4s_ease-out]">
      <header className="mb-8 animate-[fade-up_0.5s_ease-out]">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2.5" style={{ color: 'var(--text-heading)' }}>
          <Calendar size={24} style={{ color: 'var(--accent-primary)' }} />
          文章归档
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
          共 <b style={{ color: 'var(--accent-primary)' }}>{arr.length}</b> 篇文章，按时间轴呈现
        </p>
      </header>

      {q.isFetching && !q.data ? (
        <div className="card p-16 flex items-center justify-center" style={{ borderRadius: 'var(--radius-xl)' }}>
          <Spinner size="lg" />
        </div>
      ) : groups.length === 0 ? (
        <div className="card p-16 text-center" style={{ borderRadius: 'var(--radius-xl)' }}>
          <Calendar size={48} className="mx-auto mb-3 opacity-60" style={{ color: 'var(--text-subtle)' }} />
          <h3 className="font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>暂无归档</h3>
          <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>还没有文章，敬请期待</p>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={`${g.year}-${g.month}`} className="animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)]">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="px-3 py-1.5 rounded-full text-sm font-semibold"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  {g.label}
                  <span className="ml-2 text-xs opacity-70">({g.list.length})</span>
                </div>
                <div className="flex-1 h-px" style={{ background: 'var(--border-muted)' }} />
              </div>

              <div className="relative border-l-2 pl-6 space-y-4" style={{ borderColor: 'var(--border-muted)' }}>
                {g.list.map((a) => (
                  <div key={a.id} className="relative">
                    <span
                      className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2"
                      style={{
                        background: 'var(--bg-surface)',
                        borderColor: 'var(--accent-primary)',
                      }}
                    />
                    <div className="card card-hover p-4 md:p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <Link to={`/articles/${a.id}`} className="flex-1 min-w-0">
                          <h3
                            className="font-medium line-clamp-1 group-hover:text-[var(--accent-primary)] transition-colors"
                            style={{ color: 'var(--text-heading)' }}
                          >
                            {a.title || '（无标题）'}
                          </h3>
                        </Link>
                        <span className="text-xs shrink-0 inline-flex items-center gap-1" style={{ color: 'var(--text-subtle)' }}>
                          <BookOpen size={12} />
                          {formatDate(a.created_at)}
                        </span>
                      </div>
                      {(a.category || a.tags?.length) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {a.category && (
                            <Link to={`/articles?category_id=${a.category.id}`} className="chip !py-0.5">
                              {a.category.name}
                            </Link>
                          )}
                          {a.tags?.slice(0, 3).map((t: any) => (
                            <Link key={t.id} to={`/articles?tag_id=${t.id}`} className="chip !py-0.5">
                              #{t.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
