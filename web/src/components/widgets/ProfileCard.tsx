import { useQuery } from '@tanstack/react-query'
import { User, Mail, MapPin, Coffee, Heart, Github } from 'lucide-react'

export default function ProfileCard() {
  const { data: blogger } = useQuery({
    queryKey: ['blogger-info'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/blog/blogger')
        if (!res.ok) return null
        const json = await res.json()
        return json.data || null
      } catch {
        return null
      }
    },
    staleTime: 30 * 60 * 1000,
  })

  const info = blogger || {
    nickname: '叶同学',
    bio: '一个热爱技术的运维工程师，记录成长路上的每一步探索。',
    location: '杭州',
    email: 'admin@example.com',
    github: 'https://github.com',
  }

  return (
    <div className="card p-6 text-center" style={{ borderRadius: 'var(--radius-lg)' }}>
      {/* Avatar */}
      <div className="relative w-16 h-16 mx-auto mb-3">
        {info.avatar ? (
          <img
            src={info.avatar}
            alt={info.nickname || '博主'}
            className="w-16 h-16 rounded-full object-cover shadow-lg"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--color-leaf-600))' }}
          >
            {info.nickname?.[0] || 'U'}
          </div>
        )}
        <span
          className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2"
          style={{ background: '#22c55e', borderColor: 'var(--card-bg)' }}
          title="在线"
        />
      </div>

      {/* Name & Bio */}
      <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--text-heading)' }}>
        {info.nickname || '博主'}
      </h3>
      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
        {info.bio || '一个热爱技术的开发者'}
      </p>

      {/* Info list */}
      <div className="space-y-2 text-xs text-left mb-4">
        {info.location && (
          <div className="flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
            <MapPin size={13} style={{ color: 'var(--accent-primary)' }} />
            <span>{info.location}</span>
          </div>
        )}
        {info.email && (
          <div className="flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
            <Mail size={13} style={{ color: 'var(--accent-primary)' }} />
            <a href={`mailto:${info.email}`} className="hover:text-[var(--accent-primary)] truncate">{info.email}</a>
          </div>
        )}
      </div>

      {/* Social links */}
      <div className="flex items-center justify-center gap-2">
        {info.github && (
          <a
            href={info.github}
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-surface-alt)]"
            style={{ color: 'var(--text-muted)' }}
            title="GitHub"
          >
            <Github size={16} />
          </a>
        )}
        <a
          href="https://blog.csdn.net/2301_80982154?type=blog"
          target="_blank"
          rel="noreferrer"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-surface-alt)]"
          style={{ color: 'var(--text-muted)' }}
          title="CSDN"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.6 14.4c-.3.3-.8.3-1.1 0l-3.5-3.5c-.6.3-1.3.5-2 .5-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4c0 .7-.2 1.4-.5 2l3.5 3.5c.3.3.3.8 0 1.1z" />
          </svg>
        </a>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap justify-center gap-1.5 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-muted)' }}>
        {['运维', 'K8s', 'Go', '自动化'].map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full text-xs"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
