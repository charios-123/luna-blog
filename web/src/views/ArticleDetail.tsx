import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  getArticleDetail, likeArticle, unlikeArticle, getArticleComments, addComment,
  deleteArticle as deleteArticleApi,
} from '@/api/article'
import { userStore, selectIsAdmin, selectIsLoggedIn, selectUser } from '@/stores/user'
import Spinner from '@/components/ui/Spinner'
import EmptyAvatar from '@/components/ui/EmptyAvatar'
import Toast from '@/components/ui/Toast'
import ArticleCard from '@/components/ArticleCard'
import {
  Eye, Heart, Bookmark, MessageCircle, Share2, Calendar, UserCircle2,
  ChevronLeft, ChevronRight, ThumbsUp, Reply, Send, Trash2, Pin,
  FolderTree, Hash, Edit3, Clock4,
} from 'lucide-react'
import { formatDate, timeAgo } from '@/lib/utils'

export default function ArticleDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isAdmin = userStore(selectIsAdmin)
  const isLoggedIn = userStore(selectIsLoggedIn)
  const curUser = userStore(selectUser)

  const q = useQuery({
    queryKey: ['article', id],
    queryFn: () => getArticleDetail(id).catch(() => null) as Promise<any>,
  })
  const commentsQ = useQuery({
    queryKey: ['article-comments', id],
    queryFn: () => getArticleComments(id).catch(() => ({ list: [] })) as Promise<any>,
    enabled: !!id,
  })

  const article: any = q.data || null
  const comments: any[] = Array.isArray(commentsQ.data) ? commentsQ.data : (commentsQ.data?.list || [])

  // 本地操作状态：点赞、收藏
  const [liked, setLiked] = useState(!!article?.is_liked)
  const [collected, setCollected] = useState(!!article?.is_collected)
  const [likeCount, setLikeCount] = useState(article?.like_count || 0)
  const [toast, setToast] = useState<{ t: string; type?: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    setLiked(!!article?.is_liked)
    setCollected(!!article?.is_collected)
    setLikeCount(article?.like_count || 0)
  }, [article?.is_liked, article?.is_collected, article?.like_count])

  // 操作
  const likeMut = useMutation({
    mutationFn: () => (liked ? unlikeArticle(id) : likeArticle(id)) as Promise<any>,
    onSuccess: () => {
      const delta = liked ? -1 : 1
      setLiked(!liked)
      setLikeCount((c: number) => c + delta)
      setToast({ t: liked ? '已取消点赞 👍' : '点赞成功 ❤️', type: 'ok' })
    },
    onError: () => setToast({ t: '操作失败，请稍后再试', type: 'error' }),
  })

  const collectMut = useMutation({
    mutationFn: async () => {
      // 用 like/unlike 占位，后端接口确认后再换
      await new Promise((r) => setTimeout(r, 200))
      setCollected(!collected)
      setToast({ t: collected ? '已取消收藏' : '已加入收藏 ⭐', type: 'ok' })
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteArticleApi(id) as Promise<any>,
    onSuccess: () => {
      setToast({ t: '文章已删除', type: 'ok' })
      setTimeout(() => navigate('/articles'), 600)
    },
    onError: () => setToast({ t: '删除失败', type: 'error' }),
  })

  const onDelete = () => {
    if (!confirm('确定删除这篇文章吗？此操作不可恢复。')) return
    deleteMut.mutate()
  }

  const onShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setToast({ t: '链接已复制 🔗', type: 'ok' })
    } catch {
      // fallback
      prompt('复制以下链接：', url)
    }
  }

  // 评论
  const [commentText, setCommentText] = useState('')
  const [replyTarget, setReplyTarget] = useState<{ id: any; name: string; pid?: any } | null>(null)

  const submitMut = useMutation({
    mutationFn: () =>
      addComment(
        replyTarget?.pid || replyTarget?.id
          ? { article_id: id, content: commentText, parent_id: replyTarget.pid ?? replyTarget.id, reply_to_user_id: replyTarget.id }
          : { article_id: id, content: commentText },
      ) as Promise<any>,
    onSuccess: () => {
      setCommentText('')
      setReplyTarget(null)
      setToast({ t: replyTarget ? '回复成功 🎉' : '评论成功，感谢留言 🎉', type: 'ok' })
      qc.invalidateQueries({ queryKey: ['article-comments', id] })
    },
    onError: (e: any) => setToast({ t: e?.message || '发送失败', type: 'error' }),
  })

  const deleteCommentMut = useMutation({
    mutationFn: async (cid: any) => {
      // 占位，后端接口接上后替换
      await new Promise((r) => setTimeout(r, 250))
      return cid
    },
    onSuccess: (cid) => {
      setToast({ t: '评论已删除', type: 'ok' })
      qc.setQueryData(['article-comments', id], (old: any) => ({
        ...old,
        list: (old?.list || []).filter((c: any) => c.id !== cid),
      }))
    },
    onError: () => setToast({ t: '删除失败', type: 'error' }),
  })

  const canDel = (c: any) => {
    if (!curUser) return false
    if (isAdmin) return true
    return String(curUser.id) === String(c.user?.id || c.user_id)
  }

  return (
    <div className="animate-[fade-up_0.4s_ease-out]">
      {q.isFetching && !q.data ? (
        <div className="card p-20 flex items-center justify-center" style={{ borderRadius: 'var(--radius-xl)' }}>
          <Spinner size="lg" />
        </div>
      ) : !article ? (
        <div className="card p-12 text-center" style={{ borderRadius: 'var(--radius-xl)' }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>文章不存在或已删除</h2>
          <Link to="/articles" className="btn btn-primary mt-3 inline-flex">返回文章列表</Link>
        </div>
      ) : (
        <>
          {/* 正文卡 */}
          <article className="card p-6 md:p-9 lg:p-11 animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)]" style={{ borderRadius: 'var(--radius-xl)' }}>
            {/* Header */}
            <header className="mb-7 md:mb-9">
              {article.is_pinned && (
                <span className="chip mb-3 inline-flex items-center gap-1.5" style={{ background: 'color-mix(in srgb, var(--accent-warm) 18%, transparent)', color: 'var(--accent-warm)' }}>
                  <Pin size={12} /> 置顶
                </span>
              )}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight" style={{ color: 'var(--text-heading)' }}>
                {article.title}
              </h1>
              {article.summary && (
                <p className="mt-3 md:mt-4 text-base md:text-lg" style={{ color: 'var(--text-muted)' }}>
                  {article.summary}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm" style={{ color: 'var(--text-subtle)' }}>
                <span className="inline-flex items-center gap-1.5">
                  <UserCircle2 size={15} style={{ color: 'var(--accent-primary)' }} />
                  {article.author?.nickname || article.author?.username || 'Leaf'}
                </span>
                <span className="inline-flex items-center gap-1.5"><Calendar size={15} />{formatDate(article.created_at)}</span>
                {article.updated_at && new Date(article.updated_at).getTime() !== new Date(article.created_at).getTime() && (
                  <span className="inline-flex items-center gap-1.5"><Clock4 size={15} />更新 {formatDate(article.updated_at)}</span>
                )}
                <span className="inline-flex items-center gap-1.5"><Eye size={15} />{article.view_count ?? 0} 阅读</span>
              </div>

              {/* 分类标签 */}
              {(article.category || article.tags?.length) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {article.category && (
                    <Link to={`/articles?category_id=${article.category.id}`} className="chip inline-flex items-center gap-1.5">
                      <FolderTree size={12} />{article.category.name}
                    </Link>
                  )}
                  {article.tags?.map((t: any) => (
                    <Link key={t.id} to={`/articles?tag_id=${t.id}`} className="chip inline-flex items-center gap-1.5">
                      <Hash size={12} />{t.name}
                    </Link>
                  ))}
                </div>
              )}
            </header>

            {/* Cover */}
            {article.cover && (
              <div className="mb-8 rounded-[var(--radius-lg)] overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <img src={article.cover} alt="" className="w-full h-auto block" />
              </div>
            )}

            {/* 正文 */}
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{
                __html: article.content_html || article.content ||
                  (article.content_md ? article.content_md.replace(/\n/g, '<br/>') : '<p style="color:var(--text-muted)">（正文为空）</p>'),
              }}
            />

            {/* 操作按钮 */}
            <footer
              className="mt-10 md:mt-12 pt-6 border-t flex flex-wrap items-center justify-between gap-3"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => isLoggedIn ? likeMut.mutate() : (setToast({ t: '请先登录后点赞', type: 'error' }), navigate('/login'))}
                  className={`btn ${liked ? 'btn-primary' : 'btn-ghost'} !py-2 inline-flex items-center gap-1.5`}
                  disabled={likeMut.isPending}
                >
                  {likeMut.isPending ? <Spinner /> : <>
                    <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                    <span>点赞</span>
                    {likeCount > 0 && <span className="ml-0.5 opacity-80">({likeCount})</span>}
                  </>}
                </button>
                <button
                  onClick={() => isLoggedIn ? collectMut.mutate() : (setToast({ t: '请先登录', type: 'error' }), navigate('/login'))}
                  className={`btn ${collected ? 'btn-primary' : 'btn-ghost'} !py-2 inline-flex items-center gap-1.5`}
                  disabled={collectMut.isPending}
                >
                  {collectMut.isPending ? <Spinner /> : <>
                    <Bookmark size={15} fill={collected ? 'currentColor' : 'none'} />
                    {collected ? '已收藏' : '收藏'}
                  </>}
                </button>
                <button onClick={onShare} className="btn btn-ghost !py-2 inline-flex items-center gap-1.5">
                  <Share2 size={15} /> 分享
                </button>
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <Link to={`/admin/articles/${id}/edit`} className="btn btn-ghost !py-2 inline-flex items-center gap-1.5">
                    <Edit3 size={15} /> 编辑
                  </Link>
                  <button onClick={onDelete} disabled={deleteMut.isPending} className="btn btn-danger !py-2 inline-flex items-center gap-1.5">
                    {deleteMut.isPending ? <Spinner /> : <><Trash2 size={15} /> 删除</>}
                  </button>
                </div>
              )}
            </footer>
          </article>

          {/* 上下篇 */}
          {(article.prev || article.next) && (
            <nav className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {article.prev ? (
                <Link to={`/articles/${article.prev.id}`} className="card card-hover p-4 md:p-5 group" style={{ borderRadius: 'var(--radius-lg)' }}>
                  <div className="text-xs mb-1 inline-flex items-center gap-1" style={{ color: 'var(--text-subtle)' }}>
                    <ChevronLeft size={14} /> 上一篇
                  </div>
                  <div className="font-medium line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-heading)' }}>
                    {article.prev.title}
                  </div>
                </Link>
              ) : <div />}
              {article.next ? (
                <Link to={`/articles/${article.next.id}`} className="card card-hover p-4 md:p-5 group text-right" style={{ borderRadius: 'var(--radius-lg)' }}>
                  <div className="text-xs mb-1 inline-flex items-center gap-1" style={{ color: 'var(--text-subtle)' }}>
                    下一篇 <ChevronRight size={14} />
                  </div>
                  <div className="font-medium line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: 'var(--text-heading)' }}>
                    {article.next.title}
                  </div>
                </Link>
              ) : <div />}
            </nav>
          )}

          {/* 相关推荐 */}
          {article.related?.length > 0 && (
            <section className="mt-10">
              <h2 className="font-semibold text-lg md:text-xl mb-4 inline-flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
                <ThumbsUp size={18} style={{ color: 'var(--accent-primary)' }} /> 相关推荐
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {article.related.slice(0, 3).map((a: any) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          )}

          {/* 评论区 */}
          <section className="mt-10 md:mt-12 card p-6 md:p-8 animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)]" style={{ borderRadius: 'var(--radius-xl)' }}>
            <h2 className="font-semibold text-lg md:text-xl mb-5 inline-flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
              <MessageCircle size={18} style={{ color: 'var(--accent-primary)' }} />
              评论 <span className="text-sm font-normal" style={{ color: 'var(--text-subtle)' }}>({comments.length})</span>
            </h2>

            {/* 发表评论 */}
            <div className="mb-8">
              {replyTarget && (
                <div className="mb-2 text-xs inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-muted)' }}>
                  回复 @{replyTarget.name}
                  <button onClick={() => setReplyTarget(null)} className="hover:text-[var(--accent-danger)]">取消</button>
                </div>
              )}
              <div className="flex gap-3">
                <EmptyAvatar name={curUser?.nickname || curUser?.username || ''} avatar={curUser?.avatar} size={40} />
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  <textarea
                    className="input-base min-h-[88px] resize-y p-3 flex-1"
                    placeholder={isLoggedIn ? '友善发言，理性交流…' : '登录后才能评论哦～请先登录'}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={!isLoggedIn || submitMut.isPending}
                  />
                  <button
                    disabled={!isLoggedIn || !commentText.trim() || submitMut.isPending}
                    onClick={() => submitMut.mutate()}
                    className="btn btn-primary h-10 self-end sm:self-center sm:h-[88px] px-5 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {submitMut.isPending ? <Spinner /> : <><Send size={15} /> 发布</>}
                  </button>
                </div>
              </div>
              {!isLoggedIn && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
                  还没登录？<Link to="/login" className="underline" style={{ color: 'var(--accent-primary)' }}>去登录</Link>
                </p>
              )}
            </div>

            {/* 评论列表 */}
            <div className="space-y-5">
              {commentsQ.isFetching && !commentsQ.data ? (
                <div className="py-8 flex justify-center"><Spinner /></div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10" style={{ color: 'var(--text-subtle)' }}>
                  还没有评论，快来抢沙发 🛋️
                </div>
              ) : comments.map((c) => (
                <CommentView
                  key={c.id}
                  comment={c}
                  onReply={(target) => setReplyTarget(target)}
                  onDelete={(cid) => {
                    if (!canDel(c) || !confirm('确定删除该评论？')) return
                    deleteCommentMut.mutate(cid)
                  }}
                  canDel={canDel(c)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {toast && <Toast message={toast.t} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function CommentView({
  comment, onReply, onDelete, canDel,
}: {
  comment: any
  onReply: (t: any) => void
  onDelete: (id: any) => void
  canDel: boolean
}) {
  const u = comment.user || {}
  return (
    <div className="flex gap-3 group">
      <EmptyAvatar name={u.nickname || u.username} avatar={u.avatar} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium" style={{ color: 'var(--text-heading)' }}>
            {u.nickname || u.username || '匿名游客'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
            {timeAgo(comment.created_at)}
          </span>
          {comment.user?.role === 'admin' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--accent-warm) 20%, transparent)', color: 'var(--accent-warm)' }}>
              博主
            </span>
          )}
        </div>
        <div
          className="mt-1.5 markdown-body text-[14px]"
          dangerouslySetInnerHTML={{ __html: comment.content_html || comment.content || '' }}
          style={{ color: 'var(--text-fg)' }}
        />
        {comment.replies?.length > 0 && (
          <div className="mt-3 pl-4 space-y-4 border-l" style={{ borderColor: 'var(--border-muted)' }}>
            {comment.replies.map((r: any) => (
              <div key={r.id} className="flex gap-3">
                <EmptyAvatar name={r.user?.nickname} avatar={r.user?.avatar} size={32} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium" style={{ color: 'var(--text-heading)' }}>
                      {r.user?.nickname || r.user?.username || '匿名'}
                    </span>
                    {r.reply_to && <span style={{ color: 'var(--text-subtle)' }}>回复</span>}
                    {r.reply_to && <span style={{ color: 'var(--accent-primary)' }}>@{r.reply_to}</span>}
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-subtle)' }}>{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="mt-1 text-[14px]" style={{ color: 'var(--text-fg)' }}>{r.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onReply({ id: u.id, name: u.nickname || u.username || '匿名', pid: comment.id })} className="inline-flex items-center gap-1 hover:text-[var(--accent-primary)]" style={{ color: 'var(--text-muted)' }}>
            <Reply size={13} /> 回复
          </button>
          <button className="inline-flex items-center gap-1 hover:text-[var(--accent-primary)]" style={{ color: 'var(--text-muted)' }}>
            <ThumbsUp size={13} /> 赞 {comment.like_count || 0}
          </button>
          {canDel && (
            <button onClick={() => onDelete(comment.id)} className="inline-flex items-center gap-1 hover:text-[var(--accent-danger)] ml-auto" style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={13} /> 删除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
