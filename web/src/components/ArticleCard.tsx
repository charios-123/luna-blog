import { Link } from 'react-router-dom'
import { Eye, Heart, Bookmark, MessageSquare, Pin } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export interface ArticleCardData {
  id: number
  title: string
  summary?: string
  cover?: string
  is_pinned?: boolean
  view_count?: number
  like_count?: number
  favorite_count?: number
  comment_count?: number
  created_at?: string
  category?: { id: number; name: string } | null
  tags?: { id: number; name: string; color?: string }[]
  [k: string]: any
}

export default function ArticleCard({ article }: { article: ArticleCardData }) {
  return (
    <article
      className="card card-hover group overflow-hidden animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)]"
      style={{ borderRadius: 'var(--radius-xl)' }}
    >
      {/* Cover */}
      {article.cover ? (
        <Link to={`/articles/${article.id}`} className="block overflow-hidden">
          <img
            src={article.cover}
            alt={article.title}
            loading="lazy"
            className="w-full h-48 md:h-52 object-cover group-hover:scale-[1.03] transition-transform duration-500"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        </Link>
      ) : null}

      <div className="p-6 md:p-7 space-y-4">
        {/* Top meta: category + pin */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {article.is_pinned && (
              <span className="inline-flex items-center gap-1 chip" style={{
                background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                color: 'var(--accent-primary)',
              }}>
                <Pin size={12} />
                置顶
              </span>
            )}
            {article.category && (
              <Link
                to={`/articles?category_id=${article.category.id}`}
                className="chip"
              >
                {article.category.name}
              </Link>
            )}
            {article.tags?.slice(0, 2).map((t) => (
              <Link key={t.id} to={`/articles?tag_id=${t.id}`} className="chip">
                #{t.name}
              </Link>
            ))}
          </div>
          <span className="text-xs shrink-0" style={{ color: 'var(--text-subtle)' }}>
            {formatDate(article.created_at)}
          </span>
        </div>

        {/* Title */}
        <Link
          to={`/articles/${article.id}`}
          className="block group/title"
        >
          <h3
            className="text-lg md:text-xl font-semibold leading-snug group-hover/title:text-[var(--accent-primary)] transition-colors line-clamp-2"
            style={{ color: 'var(--text-heading)' }}
          >
            {article.title}
          </h3>
        </Link>

        {/* Summary */}
        {article.summary && (
          <p
            className="text-sm leading-relaxed line-clamp-3"
            style={{ color: 'var(--text-muted)' }}
          >
            {article.summary}
          </p>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-subtle)' }}>
            <span className="inline-flex items-center gap-1">
              <Eye size={14} />
              {article.view_count ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart size={14} />
              {article.like_count ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bookmark size={14} />
              {article.favorite_count ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare size={14} />
              {article.comment_count ?? 0}
            </span>
          </div>

          <Link
            to={`/articles/${article.id}`}
            className="text-sm font-medium inline-flex items-center gap-1 group/a"
            style={{ color: 'var(--accent-primary)' }}
          >
            阅读
            <span className="group-hover/a:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
