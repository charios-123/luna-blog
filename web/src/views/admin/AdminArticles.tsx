import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  listAdminArticles, deleteArticle, batchDeleteArticles,
  updateArticleStatus, updateArticlePin,
} from '@/api/article'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import {
  Search, Plus, Trash2, Edit3, Pin, Eye, EyeOff, CheckSquare, Square,
  FileText, Filter, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function AdminArticles() {
  const qc = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [status, setStatus] = useState<string>('')
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [toast, setToast] = useState<{ t: string; type?: 'ok' | 'error' } | null>(null)

  const q = useQuery({
    queryKey: ['admin-articles', keyword, page, limit, status],
    queryFn: () =>
      listAdminArticles({
        page, limit,
        keyword: keyword || undefined,
        status: status || undefined,
      }).catch(() => ({ list: [], total: 0 })) as Promise<any>,
  })

  const list: any[] = q.data?.list || []
  const total: number = q.data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const delMut = useMutation({
    mutationFn: (id: any) => deleteArticle(id),
    onSuccess: () => {
      setToast({ t: '已删除', type: 'ok' })
      qc.invalidateQueries({ queryKey: ['admin-articles'] })
    },
    onError: () => setToast({ t: '删除失败', type: 'error' }),
  })

  const batchMut = useMutation({
    mutationFn: (ids: (string | number)[]) => batchDeleteArticles(ids),
    onSuccess: () => {
      setToast({ t: `已删除 ${selected.size} 篇`, type: 'ok' })
      setSelected(new Set())
      qc.invalidateQueries({ queryKey: ['admin-articles'] })
    },
    onError: () => setToast({ t: '批量删除失败', type: 'error' }),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: any; status: number }) => updateArticleStatus(id, status),
    onSuccess: () => {
      setToast({ t: '状态已更新', type: 'ok' })
      qc.invalidateQueries({ queryKey: ['admin-articles'] })
    },
    onError: () => setToast({ t: '更新失败', type: 'error' }),
  })

  const pinMut = useMutation({
    mutationFn: ({ id, pinned }: { id: any; pinned: boolean }) => updateArticlePin(id, pinned),
    onSuccess: () => {
      setToast({ t: '置顶已更新', type: 'ok' })
      qc.invalidateQueries({ queryKey: ['admin-articles'] })
    },
    onError: () => setToast({ t: '更新失败', type: 'error' }),
  })

  const allChecked = list.length > 0 && list.every((a) => selected.has(a.id))
  const toggleAll = () => {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(list.map((a) => a.id)))
  }
  const toggleOne = (id: any) => {
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const onDelete = (a: any) => {
    if (!confirm(`确定删除文章《${a.title}》？此操作不可恢复。`)) return
    delMut.mutate(a.id)
  }

  const onBatchDelete = () => {
    if (selected.size === 0) return setToast({ t: '请先勾选文章', type: 'error' })
    if (!confirm(`确定删除选中的 ${selected.size} 篇文章？`)) return
    batchMut.mutate(Array.from(selected))
  }

  return (
    <div className="space-y-5 animate-[fade-up_0.4s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <FileText size={22} style={{ color: 'var(--accent-primary)' }} />
            文章管理
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>
            共 <b style={{ color: 'var(--accent-primary)' }}>{total}</b> 篇文章
          </p>
        </div>
        <Link to="/admin/articles/new" className="btn btn-primary inline-flex items-center gap-1.5">
          <Plus size={16} /> 写新文章
        </Link>
      </div>

      {/* Toolbar */}
      <div className="card p-4 flex flex-wrap items-center gap-3" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
            placeholder="搜索标题..."
            className="input-base pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="input-base w-auto"
        >
          <option value="">全部状态</option>
          <option value="1">已发布</option>
          <option value="0">草稿</option>
          <option value="2">已下架</option>
        </select>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['admin-articles'] })}
          className="btn btn-ghost !py-2 inline-flex items-center gap-1.5"
        >
          <RefreshCw size={15} /> 刷新
        </button>
      </div>

      {/* Batch actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-md)]" style={{ background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' }}>
          <span className="text-sm" style={{ color: 'var(--accent-primary)' }}>
            已选 {selected.size} 篇
          </span>
          <button onClick={onBatchDelete} disabled={batchMut.isPending} className="btn btn-danger !py-1.5 !px-3 text-sm inline-flex items-center gap-1.5 ml-auto">
            {batchMut.isPending ? <Spinner /> : <><Trash2 size={14} /> 批量删除</>}
          </button>
          <button onClick={() => setSelected(new Set())} className="btn btn-ghost !py-1.5 !px-3 text-sm">取消</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
        {q.isFetching && !q.data ? (
          <div className="p-16 flex justify-center"><Spinner size="lg" /></div>
        ) : list.length === 0 ? (
          <div className="p-16 text-center" style={{ color: 'var(--text-subtle)' }}>
            <FileText size={40} className="mx-auto mb-3 opacity-60" />
            <p>暂无文章</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-surface-alt)' }}>
                  <th className="px-3 py-3 text-left w-10">
                    <button onClick={toggleAll} className="p-1" style={{ color: 'var(--text-muted)' }}>
                      {allChecked ? <CheckSquare size={16} style={{ color: 'var(--accent-primary)' }} /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left font-medium" style={{ color: 'var(--text-subtle)' }}>标题</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap" style={{ color: 'var(--text-subtle)' }}>分类</th>
                  <th className="px-3 py-3 text-right font-medium whitespace-nowrap" style={{ color: 'var(--text-subtle)' }}>阅读</th>
                  <th className="px-3 py-3 text-center font-medium whitespace-nowrap" style={{ color: 'var(--text-subtle)' }}>状态</th>
                  <th className="px-3 py-3 text-left font-medium whitespace-nowrap" style={{ color: 'var(--text-subtle)' }}>发布时间</th>
                  <th className="px-3 py-3 text-right font-medium whitespace-nowrap" style={{ color: 'var(--text-subtle)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-[var(--bg-surface-alt)] transition-colors" style={{ borderColor: 'var(--border-muted)' }}>
                    <td className="px-3 py-3">
                      <button onClick={() => toggleOne(a.id)} className="p-1" style={{ color: 'var(--text-muted)' }}>
                        {selected.has(a.id) ? <CheckSquare size={16} style={{ color: 'var(--accent-primary)' }} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {a.is_pinned && <Pin size={13} style={{ color: 'var(--accent-warm)' }} fill="currentColor" />}
                        <Link to={`/articles/${a.id}`} className="font-medium truncate hover:text-[var(--accent-primary)]" style={{ color: 'var(--text-heading)' }}>
                          {a.title || '（无标题）'}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {a.category?.name || '-'}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {a.view_count ?? 0}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--text-subtle)' }}>
                      {formatDate(a.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="置顶切换" onClick={() => pinMut.mutate({ id: a.id, pinned: !a.is_pinned })} disabled={pinMut.isPending}>
                          <Pin size={14} fill={a.is_pinned ? 'currentColor' : 'none'} />
                        </IconBtn>
                        <IconBtn title="上下架" onClick={() => statusMut.mutate({ id: a.id, status: a.status === 1 ? 2 : 1 })} disabled={statusMut.isPending}>
                          {a.status === 1 ? <EyeOff size={14} /> : <Eye size={14} />}
                        </IconBtn>
                        <Link to={`/admin/articles/${a.id}/edit`} className="p-1.5 rounded hover:bg-[var(--bg-surface-alt)]" style={{ color: 'var(--text-muted)' }} title="编辑">
                          <Edit3 size={14} />
                        </Link>
                        <IconBtn title="删除" danger onClick={() => onDelete(a)} disabled={delMut.isPending}>
                          <Trash2 size={14} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border-muted)' }}>
            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              第 {page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-ghost !py-1.5 !px-2.5 disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="px-3 text-sm tabular-nums" style={{ color: 'var(--text-fg)' }}>{page}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-ghost !py-1.5 !px-2.5 disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.t} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function StatusBadge({ status }: { status: number }) {
  const map: Record<number, { label: string; bg: string; fg: string }> = {
    0: { label: '草稿', bg: 'color-mix(in srgb, var(--color-slate-500) 16%, transparent)', fg: 'var(--color-slate-600)' },
    1: { label: '已发布', bg: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)', fg: 'var(--accent-primary)' },
    2: { label: '已下架', bg: 'color-mix(in srgb, var(--accent-warm) 16%, transparent)', fg: 'var(--accent-warm)' },
  }
  const s = map[status] || map[0]
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  )
}

function IconBtn({ title, children, onClick, disabled, danger }: any) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded hover:bg-[var(--bg-surface-alt)] transition-colors disabled:opacity-50"
      style={{ color: danger ? 'var(--text-muted)' : 'var(--text-muted)' }}
    >
      {children}
    </button>
  )
}
