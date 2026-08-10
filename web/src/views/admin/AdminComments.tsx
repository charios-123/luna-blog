import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  listAdminComments, deleteCommentAsAdmin, updateCommentStatus,
} from '@/api/comment'
import Spinner from '@/components/ui/Spinner'
import EmptyAvatar from '@/components/ui/EmptyAvatar'
import Toast from '@/components/ui/Toast'
import {
  MessageSquare, Trash2, RefreshCw, Check, X, Clock, Filter,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'

type StatusFilter = '' | '0' | '1' | '2'

export default function AdminComments() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<StatusFilter>('')
  const [page, setPage] = useState(1)
  const [limit] = useState(15)
  const [toast, setToast] = useState<{ t: string; type?: 'ok' | 'error' } | null>(null)

  const q = useQuery({
    queryKey: ['admin-comments', status, page, limit],
    queryFn: () =>
      listAdminComments({
        page, limit,
        status: status || undefined,
      }).catch(() => ({ list: [], total: 0 })) as Promise<any>,
  })

  const list: any[] = q.data?.list || []
  const total: number = q.data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const delMut = useMutation({
    mutationFn: (id: any) => deleteCommentAsAdmin(id),
    onSuccess: () => {
      setToast({ t: '评论已删除', type: 'ok' })
      qc.invalidateQueries({ queryKey: ['admin-comments'] })
    },
    onError: () => setToast({ t: '删除失败', type: 'error' }),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: any; status: 0 | 1 | 2 }) => updateCommentStatus(id, status),
    onSuccess: () => {
      setToast({ t: '状态已更新', type: 'ok' })
      qc.invalidateQueries({ queryKey: ['admin-comments'] })
    },
    onError: () => setToast({ t: '更新失败', type: 'error' }),
  })

  const onDelete = (c: any) => {
    if (!confirm('确定删除该评论？')) return
    delMut.mutate(c.id)
  }

  return (
    <div className="space-y-5 animate-[fade-up_0.4s_ease-out]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <MessageSquare size={22} style={{ color: 'var(--accent-primary)' }} />
            评论管理
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>
            共 <b style={{ color: 'var(--accent-primary)' }}>{total}</b> 条评论
          </p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-comments'] })} className="btn btn-ghost !py-2 inline-flex items-center gap-1.5">
          <RefreshCw size={15} /> 刷新
        </button>
      </div>

      {/* Filter */}
      <div className="card p-4 flex items-center gap-3 flex-wrap" style={{ borderRadius: 'var(--radius-lg)' }}>
        <span className="text-sm inline-flex items-center gap-1.5" style={{ color: 'var(--text-subtle)' }}>
          <Filter size={14} /> 状态
        </span>
        <div className="flex p-1 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-surface-alt)' }}>
          {[
            { v: '', label: '全部' },
            { v: '1', label: '已通过' },
            { v: '0', label: '待审核' },
            { v: '2', label: '已拒绝' },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => { setStatus(opt.v as StatusFilter); setPage(1) }}
              className="px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium transition-all"
              style={{
                color: status === opt.v ? 'white' : 'var(--text-muted)',
                background: status === opt.v ? 'var(--accent-primary)' : 'transparent',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {q.isFetching && !q.data ? (
          <div className="card p-12 flex justify-center" style={{ borderRadius: 'var(--radius-lg)' }}><Spinner size="lg" /></div>
        ) : list.length === 0 ? (
          <div className="card p-12 text-center" style={{ borderRadius: 'var(--radius-lg)' }}>
            <MessageSquare size={40} className="mx-auto mb-3 opacity-60" style={{ color: 'var(--text-subtle)' }} />
            <p style={{ color: 'var(--text-subtle)' }}>暂无评论</p>
          </div>
        ) : (
          list.map((c) => {
            const u = c.user || {}
            return (
              <div key={c.id} className="card p-4 md:p-5 group" style={{ borderRadius: 'var(--radius-lg)' }}>
                <div className="flex gap-3">
                  <EmptyAvatar name={u.nickname || u.username} avatar={u.avatar} size={38} />
                  <div className="flex-1 min-w-0">
                    {/* 头部 */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>
                        {u.nickname || u.username || '匿名'}
                      </span>
                      <StatusPill status={c.status} />
                      <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>{timeAgo(c.created_at)}</span>
                      {c.article && (
                        <Link
                          to={`/articles/${c.article.id}`}
                          className="text-xs ml-auto truncate hover:underline"
                          style={{ color: 'var(--accent-primary)' }}
                          title={c.article.title}
                        >
                          @ {c.article.title}
                        </Link>
                      )}
                    </div>
                    {/* 内容 */}
                    <p className="text-[14px] whitespace-pre-wrap break-words" style={{ color: 'var(--text-fg)' }}>
                      {c.content}
                    </p>
                    {/* 操作 */}
                    <div className="mt-3 flex items-center gap-2">
                      {c.status !== 1 && (
                        <button
                          onClick={() => statusMut.mutate({ id: c.id, status: 1 })}
                          disabled={statusMut.isPending}
                          className="btn btn-ghost !py-1 !px-2.5 text-xs inline-flex items-center gap-1"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          <Check size={13} /> 通过
                        </button>
                      )}
                      {c.status !== 2 && (
                        <button
                          onClick={() => statusMut.mutate({ id: c.id, status: 2 })}
                          disabled={statusMut.isPending}
                          className="btn btn-ghost !py-1 !px-2.5 text-xs inline-flex items-center gap-1"
                          style={{ color: 'var(--accent-warm)' }}
                        >
                          <X size={13} /> 拒绝
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(c)}
                        disabled={delMut.isPending}
                        className="btn btn-ghost !py-1 !px-2.5 text-xs inline-flex items-center gap-1 ml-auto"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={13} /> 删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn btn-ghost !py-1.5 !px-3 disabled:opacity-40 text-sm"
          >
            上一页
          </button>
          <span className="text-sm tabular-nums" style={{ color: 'var(--text-fg)' }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="btn btn-ghost !py-1.5 !px-3 disabled:opacity-40 text-sm"
          >
            下一页
          </button>
        </div>
      )}

      {toast && <Toast message={toast.t} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function StatusPill({ status }: { status: number }) {
  const map: Record<number, { label: string; bg: string; fg: string; icon?: any }> = {
    0: { label: '待审核', bg: 'color-mix(in srgb, var(--accent-warm) 16%, transparent)', fg: 'var(--accent-warm)', icon: Clock },
    1: { label: '已通过', bg: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)', fg: 'var(--accent-primary)', icon: Check },
    2: { label: '已拒绝', bg: 'color-mix(in srgb, var(--color-slate-500) 16%, transparent)', fg: 'var(--color-slate-600)', icon: X },
  }
  const s = map[status] || map[0]
  const Icon = s.icon
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.fg }}>
      {Icon && <Icon size={10} />}
      {s.label}
    </span>
  )
}
