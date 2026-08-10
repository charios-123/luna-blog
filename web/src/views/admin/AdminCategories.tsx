import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listAdminCategories, createCategory, deleteCategory } from '@/api/tag'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import { FolderTree, Plus, Trash2, FolderPlus, RefreshCw } from 'lucide-react'

export default function AdminCategories() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [toast, setToast] = useState<{ t: string; type?: 'ok' | 'error' } | null>(null)

  const q = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => listAdminCategories().catch(() => ({ list: [] })) as Promise<any>,
  })
  const list: any[] = Array.isArray(q.data) ? q.data : (q.data?.list || [])

  const addMut = useMutation({
    mutationFn: () => createCategory({ name: name.trim(), description: desc.trim() || undefined }),
    onSuccess: () => {
      setToast({ t: '分类已添加', type: 'ok' })
      setName(''); setDesc('')
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
    },
    onError: (e: any) => setToast({ t: e?.message || '添加失败', type: 'error' }),
  })

  const delMut = useMutation({
    mutationFn: (id: any) => deleteCategory(id),
    onSuccess: () => {
      setToast({ t: '已删除', type: 'ok' })
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
    },
    onError: () => setToast({ t: '删除失败', type: 'error' }),
  })

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setToast({ t: '请输入分类名', type: 'error' })
    addMut.mutate()
  }

  const onDelete = (c: any) => {
    if (!confirm(`确定删除分类「${c.name}」？该分类下的文章将变为未分类。`)) return
    delMut.mutate(c.id)
  }

  return (
    <div className="space-y-5 animate-[fade-up_0.4s_ease-out]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <FolderTree size={22} style={{ color: 'var(--accent-primary)' }} />
            分类管理
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-subtle)' }}>
            共 <b style={{ color: 'var(--accent-primary)' }}>{list.length}</b> 个分类
          </p>
        </div>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-categories'] })} className="btn btn-ghost !py-2 inline-flex items-center gap-1.5">
          <RefreshCw size={15} /> 刷新
        </button>
      </div>

      {/* 新增表单 */}
      <form onSubmit={onAdd} className="card p-4 md:p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <h3 className="font-semibold text-sm mb-3 inline-flex items-center gap-1.5" style={{ color: 'var(--text-heading)' }}>
          <FolderPlus size={15} /> 新增分类
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="分类名称"
            className="input-base flex-1"
          />
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="描述（可选）"
            className="input-base flex-1"
          />
          <button type="submit" disabled={addMut.isPending} className="btn btn-primary inline-flex items-center gap-1.5 whitespace-nowrap">
            {addMut.isPending ? <Spinner /> : <><Plus size={16} /> 添加</>}
          </button>
        </div>
      </form>

      {/* 列表 */}
      <div className="card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
        {q.isFetching && !q.data ? (
          <div className="p-12 flex justify-center"><Spinner size="lg" /></div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--text-subtle)' }}>
            <FolderTree size={40} className="mx-auto mb-3 opacity-60" />
            <p>暂无分类</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
            {list.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 px-4 md:px-5 py-3.5 hover:bg-[var(--bg-surface-alt)] transition-colors">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', color: 'var(--accent-primary)' }}
                >
                  <FolderTree size={17} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium" style={{ color: 'var(--text-heading)' }}>{c.name}</div>
                  {c.description && (
                    <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-subtle)' }}>{c.description}</div>
                  )}
                </div>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {c.article_count ?? c.count ?? 0} 篇
                </span>
                <button
                  onClick={() => onDelete(c)}
                  disabled={delMut.isPending}
                  className="p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="删除"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.t} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
