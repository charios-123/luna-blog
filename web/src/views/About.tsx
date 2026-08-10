import { useQuery } from '@tanstack/react-query'
import { getBloggerInfo } from '@/api/settings'
import Spinner from '@/components/ui/Spinner'
import { Mail, Github, MapPin, Briefcase, Award, User, Moon } from 'lucide-react'

export default function About() {
  const q = useQuery({
    queryKey: ['about'],
    queryFn: () =>
      getBloggerInfo().catch(() => null) as Promise<any>,
  })
  const info: any = q.data || {}

  return (
    <div className="animate-[fade-up_0.4s_ease-out]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* 左侧头像卡 */}
        <section className="card p-8 animate-[fade-up_0.5s_ease-out]" style={{ borderRadius: 'var(--radius-xl)' }}>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div
                className="w-28 h-28 rounded-full overflow-hidden border-4 flex items-center justify-center"
                style={{
                  borderColor: 'var(--color-leaf-200)',
                  boxShadow: 'var(--shadow-md)',
                  background: 'var(--bg-muted)',
                }}
              >
                {info.avatar ? (
                  <img src={info.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <img src="/img/touxiang.png" alt="avatar" className="w-full h-full object-cover" />
                )}
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 flex items-center justify-center text-base"
                style={{ background: 'var(--accent-primary)', color: 'white', borderColor: 'var(--bg-surface)' }}
              >
                <Moon size={14} fill="currentColor" />
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
                {info.nickname || info.username || 'Leaf'}
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {info.title || '后端开发工程师 / 开发爱好者'}
              </p>
            </div>

            {/* 关键信息 */}
            <ul className="w-full space-y-2.5 pt-2 text-sm">
              {info.location && (
                <Li icon={<MapPin size={15} />} label="坐标" value={info.location} />
              )}
              {info.company && (
                <Li icon={<Briefcase size={15} />} label="公司" value={info.company} />
              )}
              {info.skill && (
                <Li icon={<Award size={15} />} label="技能" value={info.skill} />
              )}
              {info.email && (
                <Li icon={<Mail size={15} />} label="邮箱" value={<a href={`mailto:${info.email}`}>{info.email}</a>} />
              )}
              {info.github && (
                <Li icon={<Github size={15} />} label="GitHub" value={<a href={info.github} target="_blank" rel="noreferrer">{info.github}</a>} />
              )}
            </ul>
          </div>
        </section>

        {/* 右侧正文 */}
        <section className="lg:col-span-2 space-y-6">
          <div className="card p-7 md:p-9 animate-[fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)]" style={{ borderRadius: 'var(--radius-xl)' }}>
            <h1 className="text-2xl md:text-3xl font-bold mb-4 flex items-center gap-2.5" style={{ color: 'var(--text-heading)' }}>
              <User size={24} style={{ color: 'var(--accent-primary)' }} />
              关于我
            </h1>
            {q.isFetching && !q.data ? (
              <div className="py-10 flex justify-center"><Spinner size="lg" /></div>
            ) : info.bio || info.introduction ? (
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{
                  __html: (info.bio_html || info.bio || info.introduction || '').replace(/\n/g, '<br/>'),
                }}
              />
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>
                <p className="mb-3">
                  👋 Hi，我是 <b style={{ color: 'var(--accent-primary)' }}>Leaf</b>，一名后端开发工程师。
                </p>
                <p className="mb-3">
                  日常工作围绕 Linux、Kubernetes、监控告警、自动化脚本展开。
                  业余时间写写 Go / 前端，做一些小工具和这个博客。
                </p>
                <p className="mb-3">
                  这个博客主要记录我在技术路上踩过的坑、学到的知识、以及一些思考。
                  如果文章对你有帮助，欢迎留言交流；如果发现错误，也希望不吝赐教。
                </p>
                <p>
                  座右铭：<em style={{ color: 'var(--accent-primary)' }}>Stay hungry, stay foolish.</em>
                </p>
              </div>
            )}
          </div>

          {/* 时间线经历 */}
          <div className="card p-7 md:p-9 animate-[fade-up_0.65s_cubic-bezier(0.22,1,0.36,1)]" style={{ borderRadius: 'var(--radius-xl)' }}>
            <h2 className="text-xl font-bold mb-5" style={{ color: 'var(--text-heading)' }}>📚 我的技术栈</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'Linux', 'Kubernetes', 'Docker',
                'MySQL', 'Redis', 'Go', 'Python', 'Shell',
                'Git', 'Java', 'React', 'TypeScript',
              ].map((t) => (
                <span key={t} className="chip justify-center !py-2">{t}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Li({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }}>{icon}</span>
      <span className="text-xs shrink-0 w-10" style={{ color: 'var(--text-subtle)' }}>{label}</span>
      <span className="flex-1 break-all" style={{ color: 'var(--text-fg)' }}>{value}</span>
    </li>
  )
}
