import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getUserInfo, updateUserProfile, changePassword, uploadFile } from '@/api/user'
import { userStore, selectUser } from '@/stores/user'
import { toast } from '@/api/toast'
import Spinner from '@/components/ui/Spinner'
import EmptyAvatar from '@/components/ui/EmptyAvatar'
import {
  CalendarDays, UserCircle2, Mail, Shield, Edit3, LogOut, Lock,
  X, Upload, Eye, EyeOff, Check,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function Profile() {
  const user = userStore(selectUser)
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['profile-detail', user?.id],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => getUserInfo().catch(() => null) as Promise<any>,
  })
  const detail = q.data || user || {}

  useEffect(() => {
    if (q.data && user) {
      userStore.getState().updateUser(q.data)
    }
  }, [q.data])

  const [showEdit, setShowEdit] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const onLogout = () => {
    if (!confirm('确定要退出登录吗？')) return
    userStore.getState().logout()
    window.location.href = '/'
  }

  return (
    <div className="animate-[fade-up_0.4s_ease-out]">
      <div className="card p-7 md:p-9 animate-[fade-up_0.5s_ease-out]" style={{ borderRadius: 'var(--radius-xl)' }}>
        <header className="mb-7 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5" style={{ color: 'var(--text-heading)' }}>
            <UserCircle2 size={26} style={{ color: 'var(--accent-primary)' }} />
            个人中心
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowPwd(true)} className="btn btn-ghost !py-2 inline-flex items-center gap-1.5">
              <Lock size={15} />
              修改密码
            </button>
            <button onClick={() => setShowEdit(true)} className="btn btn-primary !py-2 inline-flex items-center gap-1.5">
              <Edit3 size={15} />
              编辑资料
            </button>
            <button onClick={onLogout} className="btn btn-danger !py-2 inline-flex items-center gap-1.5">
              <LogOut size={15} />
              退出登录
            </button>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex md:flex-col items-center md:items-start gap-5 md:w-52 shrink-0">
            <EmptyAvatar name={detail.nickname || detail.username} avatar={detail.avatar} size={120} />
            <div className="md:text-left">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>
                {detail.nickname || detail.username || '匿名用户'}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                @{detail.username || '-'}
              </p>
              {detail.role && (
                <span
                  className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: detail.role === 'admin'
                      ? 'color-mix(in srgb, var(--accent-warm) 18%, transparent)'
                      : 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                    color: detail.role === 'admin' ? 'var(--accent-warm)' : 'var(--accent-primary)',
                  }}
                >
                  <Shield size={12} />
                  {detail.role === 'admin' ? '管理员' : detail.role === 'user' ? '注册用户' : detail.role}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 pt-4 md:pt-1">
            {q.isFetching && !q.data ? (
              <div className="col-span-full py-10 flex justify-center"><Spinner /></div>
            ) : (
              <>
                <Row icon={<UserCircle2 size={16} />} label="ID" value={detail.id || '-'} />
                <Row icon={<Mail size={16} />} label="邮箱" value={detail.email || (detail.is_guest ? '游客邮箱' : '-')} />
                <Row icon={<CalendarDays size={16} />} label="注册时间" value={detail.created_at ? formatDate(detail.created_at) : '-'} />
                <Row icon={<CalendarDays size={16} />} label="上次登录" value={detail.last_login_at || detail.last_login_time ? formatDate(detail.last_login_at || detail.last_login_time) : '-'} />
                <Row icon={<UserCircle2 size={16} />} label="简介" value={detail.bio || detail.introduction || '这个人很懒，什么都没留下。'} />

                {detail.role === 'admin' && (
                  <div className="md:col-span-2 pt-4 mt-2 border-t" style={{ borderColor: 'var(--border-muted)' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-subtle)' }}>管理员操作</h3>
                    <div className="flex flex-wrap gap-3">
                      <Link to="/admin/articles" className="btn btn-primary">前往后台管理</Link>
                      <Link to="/admin/articles/new" className="btn btn-ghost">写一篇文章</Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <EditProfileModal
          initial={detail}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            userStore.getState().updateUser(updated)
            qc.setQueryData(['profile-detail', user?.id], updated)
            qc.invalidateQueries({ queryKey: ['profile-detail'] })
            qc.invalidateQueries({ queryKey: ['blogger-info'] })
            setShowEdit(false)
          }}
        />
      )}

      {showPwd && (
        <ChangePwdModal onClose={() => setShowPwd(false)} />
      )}
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs mb-1 inline-flex items-center gap-1.5" style={{ color: 'var(--text-subtle)' }}>
        {icon}
        {label}
      </div>
      <div className="text-[15px] break-all" style={{ color: 'var(--text-fg)' }}>{value || '-'}</div>
    </div>
  )
}

/* ------------------- 编辑资料弹窗 ------------------- */

function EditProfileModal({
  initial, onClose, onSaved,
}: {
  initial: any
  onClose: () => void
  onSaved: (d: any) => void
}) {
  const [nickname, setNickname] = useState(initial.nickname || '')
  const [avatar, setAvatar] = useState(initial.avatar || '')
  const [email, setEmail] = useState(initial.email || '')
  const [bio, setBio] = useState(initial.bio || initial.introduction || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUploaded, setAvatarUploaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('图片大小不能超过 5MB'); return }
    setUploading(true)
    try {
      const res = await uploadFile(file, 'avatars')
      setAvatar(res.url)
      setAvatarUploaded(true)
      toast.success('头像上传成功')
    } catch (err: any) {
      toast.error(err?.message || '上传失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const submit = async () => {
    setSaving(true)
    try {
      const payload: Record<string, any> = { nickname, avatar, email, bio }
      const updated = await updateUserProfile(payload)
      toast.success('资料已更新')
      onSaved(updated || payload)
    } catch (e: any) {
      toast.error(e?.message || '更新失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrap onClose={onClose} title="编辑资料">
      <div className="space-y-4">
        <Field label="昵称">
          <input className="input-base" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="请输入昵称" />
        </Field>
        <Field label="头像">
          <div className="flex gap-3 items-center">
            {avatar ? (
              <img src={avatar} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 border" style={{ borderColor: 'var(--border-muted)' }} />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-subtle)' }}>
                <UserCircle2 size={26} />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-ghost inline-flex items-center gap-1.5"
              disabled={uploading}
            >
              {uploading ? <Spinner size="sm" /> : <Upload size={15} />}
              {uploading ? '上传中...' : '上传头像'}
            </button>
            {avatarUploaded && (
              <button type="button" onClick={() => { setAvatar(initial.avatar || ''); setAvatarUploaded(false) }} className="btn btn-ghost !py-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
                移除
              </button>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>支持 JPG、PNG、GIF，大小不超过 5MB。</p>
        </Field>
        <Field label="邮箱">
          <input className="input-base" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </Field>
        <Field label="个人简介">
          <textarea
            className="input-base min-h-[90px] resize-y"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="一句话介绍自己..."
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="btn btn-ghost" disabled={saving}>取消</button>
        <button onClick={submit} className="btn btn-primary inline-flex items-center gap-1.5" disabled={saving}>
          {saving ? <Spinner size="sm" /> : <Check size={15} />}
          {saving ? '保存中...' : '保存修改'}
        </button>
      </div>
    </ModalWrap>
  )
}

/* ------------------- 修改密码弹窗 ------------------- */

function ChangePwdModal({ onClose }: { onClose: () => void }) {
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!oldPwd || !newPwd || !confirmPwd) { toast.error('请完整填写'); return }
    if (newPwd.length < 6) { toast.error('新密码至少 6 位'); return }
    if (newPwd !== confirmPwd) { toast.error('两次新密码不一致'); return }
    setSaving(true)
    try {
      await changePassword({ old_password: oldPwd, new_password: newPwd })
      toast.success('密码已修改，请重新登录')
      setTimeout(() => {
        userStore.getState().logout()
        window.location.href = '/login'
      }, 800)
    } catch (e: any) {
      toast.error(e?.message || '修改失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrap onClose={onClose} title="修改密码">
      <div className="space-y-4">
        <Field label="原密码">
          <div className="relative">
            <input
              className="input-base pr-10"
              type={showOld ? 'text' : 'password'}
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="请输入原密码"
            />
            <EyeBtn show={showOld} onClick={() => setShowOld(!showOld)} />
          </div>
        </Field>
        <Field label="新密码（至少 6 位）">
          <div className="relative">
            <input
              className="input-base pr-10"
              type={showNew ? 'text' : 'password'}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="至少 6 位"
            />
            <EyeBtn show={showNew} onClick={() => setShowNew(!showNew)} />
          </div>
        </Field>
        <Field label="再次输入新密码">
          <input
            className="input-base"
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="再次输入"
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="btn btn-ghost" disabled={saving}>取消</button>
        <button onClick={submit} className="btn btn-primary inline-flex items-center gap-1.5" disabled={saving}>
          {saving ? <Spinner size="sm" /> : <Lock size={15} />}
          {saving ? '修改中...' : '确认修改'}
        </button>
      </div>
    </ModalWrap>
  )
}

/* ------------------- 通用 UI 辅助 ------------------- */

function ModalWrap({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fade-in_0.2s_ease]" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div
        className="relative card w-full max-w-lg p-6 animate-[scale-in_0.2s_ease-out]"
        style={{ borderRadius: 'var(--radius-xl)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors" aria-label="关闭">
            <X size={18} style={{ color: 'var(--text-subtle)' }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-heading)' }}>{label}</div>
      {children}
    </label>
  )
}

function EyeBtn({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-black/5 transition-colors"
      style={{ color: 'var(--text-subtle)' }}
      aria-label="切换密码可见性"
    >
      {show ? <Eye size={16} /> : <EyeOff size={16} />}
    </button>
  )
}
