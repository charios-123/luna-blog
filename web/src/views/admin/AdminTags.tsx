import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listAdminTags, createTag, deleteTag } from '@/api/tag'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import { Tags, Plus, Trash2, Hash, RefreshCw } from 'lucide-react'

const COLOR_OPTIONS = [
  'var(--accent-primary)',
  'var(--accent-warm)',
  'var(--color-leaf-500)',
  'var(--color-leaf-700)',
  'var(--color-warm-600)',
  'var(--color-slate-600)',
]

export default function AdminTags() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [toast, setToast] = useState<{ t: string; type?: 'ok' | 'error' } | null>(null)

  const q = useQuery({
    queryKey: ['admin-tags'],
    queryFn: () => listAdminTags().catch(() => ({ list: [] })) as Promise<any>,
  })
  const list: any[] = Array.isArray(q.data) ? q.data : (q.data?.list || [])

  const addMut = useMutation({
    mutationFn: () => createTag({ name: name.trim(), color }),
    onSuccess: () => {
      setToast({ t: '标签已添加', type: 'ok' })
      setName('')
      qc.invalidateQueries({ queryKey: ['admin-tags'] })
    },
    onError: (e: any) => setToast({ t: e?.message || '添加失败', type: 'error' }),
  })

  const delMut = useMutation({
    mutationFn: (id: any) => deleteTag(id),
    onSuccess: () => {
      setToast({ t: '已删除', type: 'ok' })
      qc.invalidateQueries({ queryKey: ['admin-tags'] })
    },
    onError: () => setToast({ t: '删除失败', type: 'error' }),
  })

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setToast({ t: '请输入标签名', type: 'error' })
    addMut.mutate()
  }

  const onDelete = (t: any) => {
    if (!confirm(`确定删除标签「${t.name}」？`)) return
    delMut.mutate(t.id)
  }

  return (
    <div className="space-y-5 animate-[fade-up_0.4s_ease-out]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <Tags size={22} style={{ color: 'var(--accent-primary)' }} />
            标签管理
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>
            共 <b style={{ color: 'var(--accent-primary)' }}>{list.length}</b> 个标签
          </p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-tags'] })} className="btn btn-ghost !py-2 inline-flex items-center gap-1.5">
          <RefreshCw size={15} /> 刷新
        </button>
      </div>

      {/* 新增表单 */}
      <form onSubmit={onAdd} className="card p-4 md:p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <h3 className="font-semibold text-sm mb-3 inline-flex items-center gap-1.5" style={{ color: 'var(--text-heading)' }}>
          <Plus size={15} /> 新增标签
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="标签名称"
            className="input-base flex-1"
          />
          <div className="flex items-center gap-1.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform"
                style={{
                  background: c,
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: color === c ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${c}` : 'none',
                }}
              />
            ))}
          </div>
          <button type="submit" disabled={addMut.isPending} className="btn btn-primary inline-flex items-center gap-1.5 whitespace-nowrap">
            {addMut.isPending ? <Spinner /> : <><Plus size={16} /> 添加</>}
          </button>
        </div>
      </form>

      {/* 标签网格 */}
      <div className="card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        {q.isFetching && !q.data ? (
          <div className="py-10 flex justify-center"><Spinner size="lg" /></div>
        ) : list.length === 0 ? (
          <div className="py-10 text-center" style={{ color: 'var(--text-subtle)' }}>
            <Tags size={40} className="mx-auto mb-3 opacity-60" />
            <p>暂无标签</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {list.map((t) => {
              const c = t.color || 'var(--accent-primary)'
              return (
                <div
                  key={t.id}
                  className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                  style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}
                >
                  <Hash size={13} />
                  <span>{t.name}</span>
                  {t.article_count != null && (
                    <span className="text-xs opacity-70">({t.article_count})</span>
                  )}
                  <button
                    onClick={() => onDelete(t)}
                    disabled={delMut.isPending}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--bg-surface)]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.t} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
