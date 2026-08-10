import { useQuery } from '@tanstack/react-query'
import { getNotes, getNoteChapters } from '@/api/note'
import Spinner from '@/components/ui/Spinner'
import { BookOpen, Layers, FolderTree, FileText, Hash, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import { Link } from 'react-router-dom'

export default function Notes() {
  const listQ = useQuery({
    queryKey: ['notes-list'],
    queryFn: () => getNotes().catch(() => ({ list: [] })) as Promise<any>,
  })
  const chaptersQ = useQuery({
    queryKey: ['notes-chapters'],
    queryFn: () => getNoteChapters().catch(() => ([] as any[])) as Promise<any>,
  })

  const notes: any[] = Array.isArray(listQ.data) ? listQ.data : (listQ.data?.list || [])
  const chapters: any[] = Array.isArray(chaptersQ.data) ? chaptersQ.data : (chaptersQ.data?.list || [])

  // 视图切换
  const [view, setView] = useState<'chapter' | 'list'>('chapter')
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({})

  return (
    <div className="animate-[fade-up_0.4s_ease-out]">
      <header className="mb-7 animate-[fade-up_0.5s_ease-out]">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2.5" style={{ color: 'var(--text-heading)' }}>
          <BookOpen size={26} style={{ color: 'var(--accent-primary)' }} />
          学习笔记
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
          系统整理的读书笔记与技术速查手册，共 <b style={{ color: 'var(--accent-primary)' }}>{notes.length}</b> 篇
        </p>
      </header>

      {/* 视图切换 + 搜索占位 */}
      <div className="card mb-6 p-3 md:p-4 flex flex-wrap items-center gap-3 justify-between" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="flex p-1 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-surface-alt)' }}>
          <TabBtn active={view === 'chapter'} onClick={() => setView('chapter')} icon={<FolderTree size={14} />}>按章节</TabBtn>
          <TabBtn active={view === 'list'} onClick={() => setView('list')} icon={<Layers size={14} />}>按时间</TabBtn>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
          <Hash size={14} />
          {chapters.length > 0 && <>{chapters.length} 个章节</>}
        </div>
      </div>

      {listQ.isFetching && !listQ.data ? (
        <div className="card p-16 flex justify-center" style={{ borderRadius: 'var(--radius-xl)' }}><Spinner size="lg" /></div>
      ) : (
        view === 'chapter' ? (
          <ChapterView
            chapters={chapters.length ? chapters : buildChaptersFromNotes(notes)}
            notes={notes}
            openChapters={openChapters}
            toggle={(k) => setOpenChapters((s) => ({ ...s, [k]: !s[k] }))}
          />
        ) : (
          <ListView notes={notes} />
        )
      )}
    </div>
  )
}

function buildChaptersFromNotes(notes: any[]) {
  // 如果没有 API 提供的 chapters，则按 note.chapter 分组
  const map = new Map<string, any[]>()
  notes.forEach((n) => {
    const k = n.chapter?.name || n.chapter_name || n.category?.name || '未分类'
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(n)
  })
  return Array.from(map.entries()).map(([name, list], idx) => ({
    id: `ch-${idx}`,
    name,
    list,
  }))
}

function ChapterView({
  chapters, notes, openChapters, toggle,
}: {
  chapters: any[]
  notes: any[]
  openChapters: Record<string, boolean>
  toggle: (k: string) => void
}) {
  // 补充 notes 到 chapter 中（如 API 已返回则覆盖）
  const enriched = chapters.map((ch) => ({
    ...ch,
    list: ch.list?.length ? ch.list : notes.filter((n) =>
      (n.chapter?.id || n.chapter_id) === ch.id || (n.chapter?.name || n.chapter_name) === ch.name,
    ),
  }))

  if (!enriched.length) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      {enriched.map((ch) => {
        const key = String(ch.id || ch.name)
        const open = openChapters[key] ?? true
        const count = ch.list?.length || 0
        return (
          <section key={key} className="card animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)]" style={{ borderRadius: 'var(--radius-lg)' }}>
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between gap-3 px-5 md:px-6 py-4 text-left"
            >
              <span className="inline-flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', color: 'var(--accent-primary)' }}
                >
                  <FolderTree size={17} />
                </span>
                <span>
                  <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>{ch.name}</span>
                  <span className="ml-3 text-xs" style={{ color: 'var(--text-subtle)' }}>{count} 篇</span>
                </span>
              </span>
              {open ? <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />}
            </button>
            {open && (
              <div className="px-4 md:px-6 pb-5 space-y-2">
                {count === 0 ? (
                  <p className="text-sm py-3 text-center" style={{ color: 'var(--text-subtle)' }}>暂无笔记</p>
                ) : (
                  ch.list.map((n: any, i: number) => (
                    <Link
                      key={n.id}
                      to={n.link || `/notes/${n.id}`}
                      className="group flex items-center justify-between gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--bg-surface-alt)] transition-colors"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="text-xs w-6 text-center" style={{ color: 'var(--text-muted)' }}>{String(i + 1).padStart(2, '0')}</span>
                        <FileText size={14} style={{ color: 'var(--accent-primary)' }} />
                        <span className="truncate group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-fg)' }}>
                          {n.title || '（无标题）'}
                        </span>
                      </span>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-subtle)' }}>{formatDate(n.created_at)}</span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function ListView({ notes }: { notes: any[] }) {
  if (!notes.length) return <EmptyState />
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {notes.map((n) => (
        <Link key={n.id} to={n.link || `/notes/${n.id}`} className="card card-hover p-5 group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs mb-2 inline-flex items-center gap-1" style={{ color: 'var(--text-subtle)' }}>
                <BookOpen size={12} style={{ color: 'var(--accent-primary)' }} />
                {n.chapter?.name || n.chapter_name || '笔记'}
              </div>
              <h3 className="font-medium line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-heading)' }}>
                {n.title}
              </h3>
              {n.summary && <p className="mt-2 text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>{n.summary}</p>}
            </div>
          </div>
          <div className="mt-4 text-xs flex items-center justify-between" style={{ color: 'var(--text-subtle)' }}>
            <span>{formatDate(n.created_at)}</span>
            <span>{n.view_count ?? 0} 阅读</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function TabBtn({ active, icon, children, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-[var(--radius-md)] text-sm font-medium inline-flex items-center gap-1.5 transition-all"
      style={{
        color: active ? 'white' : 'var(--text-muted)',
        background: active ? 'var(--accent-primary)' : 'transparent',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
      }}
    >
      {icon}
      {children}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="card p-16 text-center" style={{ borderRadius: 'var(--radius-xl)' }}>
      <BookOpen size={48} className="mx-auto mb-3 opacity-60" style={{ color: 'var(--text-subtle)' }} />
      <h3 className="font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>暂无笔记</h3>
      <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>持续整理中…请关注后续更新</p>
    </div>
  )
}
