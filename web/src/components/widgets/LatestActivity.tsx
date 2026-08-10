import { useQuery } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getArticles } from '@/api/article'
import { fromNow } from '@/lib/utils'

export default function LatestActivity() {
  const { data } = useQuery({
    queryKey: ['articles', 'latest'],
    queryFn: () => getArticles({ page: 1, limit: 5 }),
    staleTime: 5 * 60 * 1000,
  })

  const list = Array.isArray(data) ? data : (data?.list || [])

  return (
    <div className="card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} style={{ color: 'var(--accent-primary)' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>最新动态</span>
      </div>
      <ul className="space-y-3">
        {list.slice(0, 5).map((a: any) => (
          <li key={a.id}>
            <Link to={`/articles/${a.id}`} className="group block">
              <div className="text-sm line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-fg)' }}>
                {a.title}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-subtle)' }}>
                <span>{fromNow(a.created_at)}</span>
                <span>·</span>
                <span>{a.view_count ?? 0} 阅读</span>
              </div>
            </Link>
          </li>
        ))}
        {list.length === 0 && (
          <li className="text-xs" style={{ color: 'var(--text-subtle)' }}>暂无动态</li>
        )}
      </ul>
    </div>
  )
}
