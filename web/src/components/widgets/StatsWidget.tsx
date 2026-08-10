import { useQuery } from '@tanstack/react-query'
import { BarChart3, FileText, Eye, Heart } from 'lucide-react'
import { getStats } from '@/api/stats'

export default function StatsWidget() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    staleTime: 5 * 60 * 1000,
  })

  const totalArticles = stats?.total_articles ?? 0
  const totalViews = stats?.total_views ?? 0
  const totalLikes = stats?.total_likes ?? 0
  const totalComments = stats?.total_comments ?? 0

  const items = [
    { icon: FileText, label: '文章', value: totalArticles, color: 'var(--accent-primary)' },
    { icon: Eye, label: '阅读', value: totalViews, color: 'var(--accent-primary)' },
    { icon: Heart, label: '点赞', value: totalLikes, color: 'var(--accent-primary)' },
    { icon: BarChart3, label: '评论', value: totalComments, color: 'var(--accent-primary)' },
  ]

  return (
    <div className="card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={14} style={{ color: 'var(--accent-primary)' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>站点统计</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center p-2 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
            <item.icon size={14} style={{ color: item.color }} />
            <span className="text-lg font-bold mt-1" style={{ color: 'var(--text-heading)' }}>
              {item.value.toLocaleString()}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
