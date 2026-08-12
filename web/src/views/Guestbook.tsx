import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getGuestbook, addGuestbook, deleteGuestbook } from '@/api/guestbook'
import { userStore, selectIsAdmin, selectIsLoggedIn, selectUser } from '@/stores/user'
import Spinner from '@/components/ui/Spinner'
import EmptyAvatar from '@/components/ui/EmptyAvatar'
import Toast from '@/components/ui/Toast'
import {
  MessageCircle, Send, ThumbsUp, Trash2, Reply, Shield, Sparkles, Heart,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export default function Guestbook() {
  const qc = useQueryClient()
  const isAdmin = userStore(selectIsAdmin)
  const isLoggedIn = userStore(selectIsLoggedIn)
  const curUser = userStore(selectUser)

  const q = useQuery({
    queryKey: ['guestbook'],
    queryFn: () => getGuestbook().catch(() => ({ list: [] })) as Promise<any>,
  })
  const comments: any[] = Array.isArray(q.data) ? q.data : (q.data?.list || [])

  const [content, setContent] = useState('')
  const [replyTarget, setReplyTarget] = useState<{ id: any; name: string; pid?: any } | null>(null)
  const [toast, setToast] = useState<{ t: string; type?: 'ok' | 'error' } | null>(null)

  const submitMut = useMutation({
    mutationFn: () =>
      addGuestbook(
        replyTarget?.pid || replyTarget?.id
          ? { content, parent_id: replyTarget.pid ?? replyTarget.id, reply_to_user_id: replyTarget.id }
          : { content },
      ) as Promise<any>,
    onSuccess: () => {
      setContent('')
      setReplyTarget(null)
      setToast({ t: replyTarget ? '回复成功 🎉' : '留言成功，感谢来到我的小站 🌿', type: 'ok' })
      qc.invalidateQueries({ queryKey: ['guestbook'] })
    },
    onError: (e: any) => setToast({ t: e?.message || '发送失败', type: 'error' }),
  })

  const deleteMut = useMutation({
    mutationFn: async (cid: any) => {
      await deleteGuestbook(cid)
      return cid
    },
    onSuccess: (cid) => {
      setToast({ t: '留言已删除', type: 'ok' })
      qc.setQueryData(['guestbook'], (old: any) => ({
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
      {/* Hero */}
      <div
        className="card p-7 md:p-10 text-center mb-7 animate-[fade-up_0.5s_ease-out] relative overflow-hidden"
        style={{
          borderRadius: 'var(--radius-xl)',
          background: 'radial-gradient(500px 200px at 50% 0%, color-mix(in srgb, var(--accent-primary) 18%, transparent), transparent 60%), var(--bg-surface)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-primary)', color: 'white', boxShadow: 'var(--shadow-sm)' }}
          >
            <Sparkles size={22} />
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
          留言板
        </h1>
        <p className="text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>
          这里是和朋友们唠嗑的地方，欢迎留下你的足迹 💬 可以：留言、吐槽、交流技术、甚至交个朋友～
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-subtle)' }}>
          <Heart size={13} style={{ color: 'var(--accent-warm)' }} />
          共 <b className="mx-1" style={{ color: 'var(--accent-primary)' }}>{comments.length}</b> 条留言
        </div>
      </div>

      {/* 发表区 */}
      <section className="card p-5 md:p-7 mb-7 animate-[fade-up_0.55s_cubic-bezier(0.22,1,0.36,1)]" style={{ borderRadius: 'var(--radius-xl)' }}>
        {replyTarget && (
          <div className="mb-3 text-xs inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-muted)' }}>
            回复 @{replyTarget.name}
            <button onClick={() => setReplyTarget(null)} className="hover:text-[var(--accent-danger)]">取消</button>
          </div>
        )}
        <div className="flex gap-3">
          <EmptyAvatar name={curUser?.nickname || curUser?.username} avatar={curUser?.avatar} size={44} />
          <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
            <textarea
              className="input-base min-h-[96px] resize-y p-3.5 flex-1"
              placeholder={isLoggedIn
                ? '说点什么吧～可以分享你的经验，或者打个招呼 👋'
                : '登录后才能留言哦～请先登录'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={!isLoggedIn || submitMut.isPending}
            />
            <button
              disabled={!isLoggedIn || !content.trim() || submitMut.isPending}
              onClick={() => submitMut.mutate()}
              className="btn btn-primary h-11 self-end sm:self-center sm:h-[96px] px-6 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              {submitMut.isPending ? <Spinner /> : <><Send size={16} /> 留言</>}
            </button>
          </div>
        </div>
        {!isLoggedIn && (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
            还没登录？<Link to="/login" className="underline" style={{ color: 'var(--accent-primary)' }}>去登录</Link>
          </p>
        )}
      </section>

      {/* 留言列表 */}
      <section className="card p-5 md:p-7 animate-[fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)]" style={{ borderRadius: 'var(--radius-xl)' }}>
        <h2 className="font-semibold mb-5 inline-flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
          <MessageCircle size={17} style={{ color: 'var(--accent-primary)' }} />
          大家的留言
        </h2>

        <div className="space-y-6">
          {q.isFetching && !q.data ? (
            <div className="py-10 flex justify-center"><Spinner size="lg" /></div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-subtle)' }}>
              <MessageCircle size={40} className="mx-auto mb-3 opacity-60" />
              <p className="mb-2">还没有人留言，快来抢沙发 🛋️</p>
              <p className="text-xs">第一位留言有神秘加成 😉</p>
            </div>
          ) : (
            comments.map((c) => (
              <ItemView
                key={c.id}
                comment={c}
                isAdmin={isAdmin}
                canDel={canDel(c)}
                onReply={(t) => setReplyTarget(t)}
                onDelete={(cid) => {
                  if (!canDel(c) || !confirm('确定删除该留言？')) return
                  deleteMut.mutate(cid)
                }}
              />
            ))
          )}
        </div>
      </section>

      {toast && <Toast message={toast.t} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function ItemView({
  comment, isAdmin, canDel, onReply, onDelete,
}: {
  comment: any
  isAdmin: boolean
  canDel: boolean
  onReply: (t: any) => void
  onDelete: (id: any) => void
}) {
  const u = comment.user || {}
  return (
    <div className="flex gap-3 group border-b pb-6 last:border-b-0 last:pb-2" style={{ borderColor: 'var(--border-soft)' }}>
      <EmptyAvatar name={u.nickname || u.username} avatar={u.avatar} size={42} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium" style={{ color: 'var(--text-heading)' }}>
            {u.nickname || u.username || '匿名游客'}
          </span>
          {u.role === 'admin' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ background: 'color-mix(in srgb, var(--accent-warm) 20%, transparent)', color: 'var(--accent-warm)' }}>
              <Shield size={10} />博主
            </span>
          )}
          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>{timeAgo(comment.created_at)}</span>
          <span className="ml-auto text-xs inline-flex items-center gap-1" style={{ color: 'var(--text-subtle)' }}>
            #{comment.floor || comment.id}
          </span>
        </div>
        <p className="mt-2 text-[15px] whitespace-pre-wrap break-words" style={{ color: 'var(--text-fg)' }}>
          {comment.content}
        </p>
        {comment.replies?.length > 0 && (
          <div className="mt-4 pl-4 space-y-4 border-l" style={{ borderColor: 'var(--border-muted)' }}>
            {comment.replies.map((r: any) => (
              <div key={r.id} className="flex gap-3">
                <EmptyAvatar name={r.user?.nickname} avatar={r.user?.avatar} size={30} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium" style={{ color: 'var(--text-heading)' }}>
                      {r.user?.nickname || r.user?.username || '匿名'}
                    </span>
                    {r.reply_to && <span style={{ color: 'var(--text-subtle)' }}>回复</span>}
                    {r.reply_to && <span style={{ color: 'var(--accent-primary)' }}>@{r.reply_to}</span>}
                    {r.user?.role === 'admin' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--accent-warm) 18%, transparent)', color: 'var(--accent-warm)' }}>博主</span>
                    )}
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-subtle)' }}>{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="mt-1 text-[14px] whitespace-pre-wrap break-words" style={{ color: 'var(--text-fg)' }}>{r.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs">
          <button onClick={() => onReply({ id: u.id, name: u.nickname || u.username || '匿名', pid: comment.id })} className="inline-flex items-center gap-1.5 hover:text-[var(--accent-primary)]" style={{ color: 'var(--text-muted)' }}>
            <Reply size={13} /> 回复
          </button>
          <button className="inline-flex items-center gap-1.5 hover:text-[var(--accent-primary)]" style={{ color: 'var(--text-muted)' }}>
            <ThumbsUp size={13} /> 赞 {comment.like_count || 0}
          </button>
          {canDel && (
            <button onClick={() => onDelete(comment.id)} className="inline-flex items-center gap-1.5 hover:text-[var(--accent-danger)] ml-auto" style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={13} /> {isAdmin ? '删除（管理员）' : '删除'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
