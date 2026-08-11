import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getAdminArticle, createArticle, updateArticle } from '@/api/article'
import { getCategories } from '@/api/tag'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import {
  ArrowLeft, Save, Eye, EyeOff, FileText, Image as ImageIcon, FolderTree,
  Bold, Italic, List as ListIcon, Code as CodeIcon, Link2, Quote, Heading, Edit3,
} from 'lucide-react'

export default function ArticleEditor() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [cover, setCover] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [status, setStatus] = useState(1) // 1 发布 0 草稿
  const [isPinned, setIsPinned] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [toast, setToast] = useState<{ t: string; type?: 'ok' | 'error' } | null>(null)

  const catsQ = useQuery({
    queryKey: ['admin-cats-options'],
    queryFn: () => getCategories().catch(() => ({ list: [] })) as Promise<any>,
  })

  const cats: any[] = Array.isArray(catsQ.data) ? catsQ.data : (catsQ.data?.list || [])

  const detailQ = useQuery({
    queryKey: ['admin-article-edit', id],
    enabled: isEdit,
    queryFn: () => getAdminArticle(id as string).catch(() => null) as Promise<any>,
  })

  useEffect(() => {
    if (detailQ.data) {
      const a = detailQ.data
      setTitle(a.title || '')
      setSummary(a.summary || '')
      setContent(a.content_markdown || '')
      setCover(a.cover || '')
      setCategoryId(a.category_id ? String(a.category_id) : (a.category?.id ? String(a.category.id) : ''))
      setStatus(a.status ?? 1)
      setIsPinned(!!a.is_pinned)
    }
  }, [detailQ.data])

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        title, summary, content_markdown: content, cover: cover || undefined,
        category_id: categoryId ? Number(categoryId) : undefined,
        status, is_pinned: isPinned,
      }
      return isEdit
        ? updateArticle(id as string, payload)
        : createArticle(payload)
    },
    onSuccess: () => {
      setToast({ t: isEdit ? '更新成功，已保存' : '发布成功 🎉', type: 'ok' })
      setTimeout(() => navigate('/admin/articles'), 700)
    },
    onError: (e: any) => setToast({ t: e?.message || '保存失败', type: 'error' }),
  })

  const onSave = (publishStatus?: number) => {
    if (publishStatus !== undefined) setStatus(publishStatus)
    if (!title.trim()) return setToast({ t: '请填写标题', type: 'error' })
    if (!content.trim()) return setToast({ t: '请填写正文', type: 'error' })
    if (!categoryId) return setToast({ t: '请选择分类', type: 'error' })
    saveMut.mutate()
  }

  const insertMd = (before: string, after = '', placeholder = '') => {
    const ta = document.getElementById('md-editor') as HTMLTextAreaElement
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const sel = content.slice(start, end) || placeholder
    const newText = content.slice(0, start) + before + sel + after + content.slice(end)
    setContent(newText)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, start + before.length + sel.length)
    })
  }

  return (
    <div className="space-y-5 animate-[fade-up_0.4s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/admin/articles" className="btn btn-ghost !py-2 !px-2.5">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
              <FileText size={22} style={{ color: 'var(--accent-primary)' }} />
              {isEdit ? '编辑文章' : '写新文章'}
            </h1>
            {isEdit && detailQ.isFetching && !detailQ.data && (
              <span className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--text-subtle)' }}>
                <Spinner /> 加载中…
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-ghost !py-2 inline-flex items-center gap-1.5"
          >
            {showPreview ? <Edit3 size={15} /> : <Eye size={15} />}
            {showPreview ? '编辑' : '预览'}
          </button>
          <button onClick={() => onSave(0)} disabled={saveMut.isPending} className="btn btn-ghost !py-2 inline-flex items-center gap-1.5">
            <Save size={15} /> 存草稿
          </button>
          <button onClick={() => onSave(1)} disabled={saveMut.isPending} className="btn btn-primary !py-2 inline-flex items-center gap-1.5">
            {saveMut.isPending ? <Spinner /> : <><Save size={15} /> 发布</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* 主编辑区 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 标题 */}
          <div className="card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="文章标题..."
              className="w-full bg-transparent outline-none text-xl md:text-2xl font-bold"
              style={{ color: 'var(--text-heading)' }}
            />
          </div>

          {/* 摘要 */}
          <div className="card p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-subtle)' }}>摘要（可选）</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="一句话简介，显示在列表卡片上..."
              className="input-base min-h-[60px] resize-y"
            />
          </div>

          {/* 编辑器 / 预览 */}
          <div className="card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
            {/* 工具栏 */}
            {!showPreview && (
              <div className="flex items-center gap-1 px-3 py-2 border-b" style={{ borderColor: 'var(--border-muted)' }}>
                <ToolBtn onClick={() => insertMd('# ', '', '标题')}><Heading size={15} /></ToolBtn>
                <ToolBtn onClick={() => insertMd('**', '**', '粗体')}><Bold size={15} /></ToolBtn>
                <ToolBtn onClick={() => insertMd('*', '*', '斜体')}><Italic size={15} /></ToolBtn>
                <ToolBtn onClick={() => insertMd('> ', '', '引用')}><Quote size={15} /></ToolBtn>
                <ToolBtn onClick={() => insertMd('- ', '', '列表项')}><ListIcon size={15} /></ToolBtn>
                <ToolBtn onClick={() => insertMd('`', '`', 'code')}><CodeIcon size={15} /></ToolBtn>
                <ToolBtn onClick={() => insertMd('[', '](https://)', '链接文字')}><Link2 size={15} /></ToolBtn>
              </div>
            )}
            {showPreview ? (
              <div
                className="markdown-body p-5 md:p-6 min-h-[400px]"
                dangerouslySetInnerHTML={{
                  __html: content
                    ? content.replace(/\n/g, '<br/>')
                    : '<p style="color:var(--text-muted)">（没有内容可预览）</p>',
                }}
              />
            ) : (
              <textarea
                id="md-editor"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="支持 Markdown 语法，开始写作吧..."
                className="w-full bg-transparent outline-none p-5 md:p-6 min-h-[420px] resize-y font-mono text-[14px] leading-relaxed"
                style={{ color: 'var(--text-fg)' }}
              />
            )}
          </div>
        </div>

        {/* 侧栏设置 */}
        <div className="space-y-4">
          {/* 发布设置 */}
          <div className="card p-4 space-y-3" style={{ borderRadius: 'var(--radius-lg)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>发布设置</h3>
            <label className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-fg)' }}>状态</span>
              <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className="input-base w-auto !py-1 text-sm">
                <option value={1}>已发布</option>
                <option value={0}>草稿</option>
                <option value={2}>下架</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm cursor-pointer">
              <span style={{ color: 'var(--text-fg)' }}>置顶</span>
              <button
                onClick={() => setIsPinned(!isPinned)}
                className="w-10 h-6 rounded-full transition-colors relative"
                style={{ background: isPinned ? 'var(--accent-primary)' : 'var(--bg-surface-alt)' }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                  style={{ left: isPinned ? '22px' : '2px' }}
                />
              </button>
            </label>
          </div>

          {/* 封面 */}
          <div className="card p-4 space-y-2" style={{ borderRadius: 'var(--radius-lg)' }}>
            <h3 className="font-semibold text-sm inline-flex items-center gap-1.5" style={{ color: 'var(--text-heading)' }}>
              <ImageIcon size={14} /> 封面图
            </h3>
            {cover && (
              <div className="rounded-[var(--radius-md)] overflow-hidden mb-2" style={{ background: 'var(--bg-muted)' }}>
                <img src={cover} alt="" className="w-full h-32 object-cover" />
              </div>
            )}
            <input
              type="text"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="图片 URL"
              className="input-base text-sm"
            />
          </div>

          {/* 分类 */}
          <div className="card p-4 space-y-2" style={{ borderRadius: 'var(--radius-lg)' }}>
            <h3 className="font-semibold text-sm inline-flex items-center gap-1.5" style={{ color: 'var(--text-heading)' }}>
              <FolderTree size={14} /> 分类
            </h3>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-base text-sm">
              <option value="">未分类</option>
              {cats.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.t} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function ToolBtn({ children, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded hover:bg-[var(--bg-surface-alt)] transition-colors"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </button>
  )
}
