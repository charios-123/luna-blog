import { useMemo, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Filter, SlidersHorizontal, FolderTree, X } from 'lucide-react'
import ArticleCard from '@/components/ArticleCard'
import Spinner from '@/components/ui/Spinner'
import { getArticles, searchArticles } from '@/api/article'
import { getCategories } from '@/api/tag'

export default function Articles() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '10', 10)
  const keyword = searchParams.get('keyword') || ''
  const category_id = searchParams.get('category_id') || ''

  const [searchInput, setSearchInput] = useState(keyword)

  // 把 searchParams 同步发 query，同时作为 debounce 搜索
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== keyword) {
        searchParams.set('keyword', searchInput)
        searchParams.set('page', '1')
        setSearchParams(searchParams, { replace: true })
      }
    }, 450)
    return () => clearTimeout(t)
  }, [searchInput]) // eslint-disable-line

  const listQ = useQuery({
    queryKey: ['articles', { page, limit, keyword, category_id }],
    queryFn: () =>
      keyword
        ? searchArticles(keyword, { page, limit, category_id: category_id || undefined }).catch(() => ({ list: [], total: 0 }))
        : getArticles({ page, limit, category_id: category_id || undefined }).catch(() => ({ list: [], total: 0 })),
  })

  const catsQ = useQuery({
    queryKey: ['articles', 'categories'],
    queryFn: () => getCategories().catch(() => []),
  })

  const list = (listQ.data?.list as any[]) || []
  const total = (listQ.data?.total as number) || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const categories = (catsQ.data as any[]) || []

  const setParam = (key: string, val: string) => {
    const np = new URLSearchParams(searchParams.toString())
    if (val) np.set(key, val)
    else np.delete(key)
    np.set('page', '1')
    setSearchParams(np)
  }

  const goPage = (p: number) => {
    const np = new URLSearchParams(searchParams.toString())
    np.set('page', String(p))
    setSearchParams(np)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearAll = () => {
    setSearchParams(new URLSearchParams(''))
    setSearchInput('')
  }

  const pages = useMemo(() => buildPages(page, totalPages), [page, totalPages])

  return (
    <div className="animate-[fade-up_0.4s_ease-out]">
      <header className="mb-8 space-y-5 animate-[fade-up_0.5s_ease-out]">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
            所有文章
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
            共 <b style={{ color: 'var(--accent-primary)' }}>{total}</b> 篇文章
            {keyword && <> · 关键词「{keyword}」</>}
          </p>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--text-subtle)' }} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索文章标题 / 内容 / 标签..."
            className="input !pl-11 !py-3 !text-[15px]"
            style={{ borderRadius: 'var(--radius-lg)' }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setParam('keyword', '') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost !p-1.5"
              aria-label="清除搜索"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 筛选 chips */}
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <FilterBlock
            icon={<FolderTree size={15} />}
            title="分类"
            paramKey="category_id"
            current={category_id}
            items={categories.map((c: any) => ({ id: String(c.id), name: c.name }))}
            onSelect={(v) => setParam('category_id', v)}
          />
          {(keyword || category_id) && (
            <div className="md:ml-auto flex items-center justify-end md:pt-1">
              <button type="button" className="btn btn-outline !py-1.5" onClick={clearAll}>
                <X size={14} /> 清除筛选
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 列表 */}
      {listQ.isFetching && !listQ.data ? (
        <div className="card p-16 flex items-center justify-center" style={{ borderRadius: 'var(--radius-xl)' }}>
          <Spinner size="lg" />
        </div>
      ) : list.length === 0 ? (
        <div className="card p-16 text-center" style={{ borderRadius: 'var(--radius-xl)' }}>
          <div className="text-5xl mb-4 opacity-70">🔍</div>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>没有找到相关文章</h3>
          <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>换个关键词或清除筛选试试吧～</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {list.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-1.5 flex-wrap">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
            className="btn btn-outline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`e${i}`} className="px-2 text-sm" style={{ color: 'var(--text-subtle)' }}>…</span>
            ) : (
              <button
                type="button"
                key={p}
                onClick={() => goPage(p as number)}
                className="btn min-w-[40px]"
                style={{
                  background: p === page ? 'var(--accent-primary)' : 'transparent',
                  color: p === page ? 'white' : 'var(--text-fg)',
                  border: p === page ? 'none' : '1px solid var(--border-default)',
                }}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => goPage(page + 1)}
            className="btn btn-outline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </nav>
      )}
    </div>
  )
}

function FilterBlock({
  icon, title, current, items, onSelect,
}: {
  icon: React.ReactNode
  title: string
  paramKey: string
  current: string
  items: { id: string; name: string }[]
  onSelect: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        <SlidersHorizontal size={13} />
        <span>{title}</span>
        {items.length > 5 && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="ml-auto text-[var(--accent-primary)] cursor-pointer hover:underline">
            {open ? '收起' : `展开 (${items.length - 5}+)`}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(open ? items : items.slice(0, 5)).map((it) => {
          const active = current === it.id
          return (
            <button
              type="button"
              key={it.id}
              onClick={() => onSelect(it.id)}
              className={`chip !cursor-pointer ${active ? '' : ''}`}
              style={{
                background: active ? 'var(--accent-primary)' : undefined,
                color: active ? 'white' : undefined,
                border: active ? 'none' : '1px solid var(--border-muted)',
              }}
            >
              {icon && <span className="opacity-80">{icon}</span>}
              {it.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)
  return pages
}
