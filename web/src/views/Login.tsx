import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { login, register } from '@/api/auth'
import { userStore } from '@/stores/user'
import Spinner from '@/components/ui/Spinner'
import Toast from '@/components/ui/Toast'
import Captcha, { type CaptchaHandle } from '@/components/ui/Captcha'
import { Moon, Mail, Lock, UserCircle2, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'

type Tab = 'login' | 'register'

export default function Login() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'register' ? 'register' : 'login')
  const navigate = useNavigate()

  // login form
  const [emailOrName, setEmailOrName] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  // register form
  const [rUsername, setRUsername] = useState('')
  const [rNickname, setRNickname] = useState('')
  const [rEmail, setREmail] = useState('')
  const [rPassword, setRPassword] = useState('')
  const [rCode, setRCode] = useState('')

  // 图形验证码
  const captchaRef = useRef<CaptchaHandle>(null)

  const [toast, setToast] = useState<{ t: string; type?: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    setParams((p) => {
      p.set('tab', tab)
      return p
    }, { replace: true })
  }, [tab, setParams])

  const loginMut = useMutation({
    mutationFn: () => login({ account: emailOrName.trim(), password }) as Promise<any>,
    onSuccess(res: any) {
      const token = res?.token || res?.data?.token
      const user = res?.user || res?.data?.user
      if (token) {
        userStore.getState().setAuth(token, user)
        setToast({ t: '登录成功，欢迎回来', type: 'ok' })
        setTimeout(() => navigate('/'), 600)
      } else if (user) {
        userStore.getState().setAuth('', user)
        setToast({ t: '登录成功', type: 'ok' })
        setTimeout(() => navigate('/'), 600)
      } else {
        setToast({ t: '登录成功', type: 'ok' })
      }
    },
    onError: (e: any) => setToast({ t: e?.message || '登录失败，请检查账号密码', type: 'error' }),
  })

  const registerMut = useMutation({
    mutationFn: () =>
      register({
        username: rUsername.trim(),
        nickname: rNickname.trim() || undefined,
        email: rEmail.trim(),
        password: rPassword,
      }) as Promise<any>,
    onSuccess(res: any) {
      const token = res?.token || res?.data?.token
      const user = res?.user || res?.data?.user
      if (token) userStore.getState().setAuth(token, user)
      setToast({ t: '注册成功，已自动登录 🎉', type: 'ok' })
      setTimeout(() => navigate('/'), 700)
    },
    onError: (e: any) => setToast({ t: e?.message || '注册失败', type: 'error' }),
  })

  const onLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailOrName.trim()) return setToast({ t: '请输入邮箱/用户名', type: 'error' })
    if (!password) return setToast({ t: '请输入密码', type: 'error' })
    loginMut.mutate()
  }

  const onRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rUsername.trim()) return setToast({ t: '请输入用户名', type: 'error' })
    if (!rEmail.trim()) return setToast({ t: '请输入邮箱', type: 'error' })
    if (!rPassword) return setToast({ t: '请输入密码', type: 'error' })
    if (rPassword.length < 6) return setToast({ t: '密码至少 6 位', type: 'error' })
    if (!rCode.trim()) return setToast({ t: '请输入验证码', type: 'error' })
    // 前端验证图形验证码
    if (!captchaRef.current?.validate(rCode)) {
      setToast({ t: '验证码不正确', type: 'error' })
      captchaRef.current?.refresh()
      setRCode('')
      return
    }
    registerMut.mutate()
  }

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center py-12 px-4">
      <div
        className="w-full max-w-md card p-8 md:p-9 animate-[fade-up_0.5s_ease-out] relative overflow-hidden"
        style={{ borderRadius: 'var(--radius-2xl)' }}
      >
        {/* 背景装饰 */}
        <div
          className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: 'var(--accent-primary)' }}
        />
        <div
          className="absolute -bottom-24 -left-16 w-56 h-56 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'var(--accent-warm)' }}
        />

        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-primary)', color: 'white', boxShadow: 'var(--shadow-sm)' }}
            >
              <Moon size={22} fill="currentColor" />
            </span>
          </div>
          <h1 className="text-center text-xl md:text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            {tab === 'login' ? '欢迎回来' : '创建账号'}
          </h1>
          <p className="text-center text-xs md:text-sm mt-1.5" style={{ color: 'var(--text-subtle)' }}>
            {tab === 'login' ? '登录后可以留言评论、收藏喜欢的文章' : '几秒钟即可完成注册，一起记录成长'}
          </p>

          {/* Tabs */}
          <div className="flex p-1 mt-6 rounded-[var(--radius-lg)]" style={{ background: 'var(--bg-surface-alt)' }}>
            <TabBtn active={tab === 'login'} onClick={() => setTab('login')}>登录</TabBtn>
            <TabBtn active={tab === 'register'} onClick={() => setTab('register')}>注册</TabBtn>
          </div>

          {/* 表单 */}
          <div className="mt-6">
            {tab === 'login' ? (
              <form className="space-y-4" onSubmit={onLogin}>
                <Field icon={<UserCircle2 size={17} />} label="用户名">
                  <input
                    type="text"
                    value={emailOrName}
                    onChange={(e) => setEmailOrName(e.target.value)}
                    placeholder="请输入用户名"
                    autoComplete="username"
                    className="input-base"
                  />
                </Field>

                <Field icon={<Lock size={17} />} label="密码">
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      autoComplete="current-password"
                      className="input-base pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-surface-alt)] transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showPwd ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </Field>

                <button className="btn btn-primary w-full justify-center gap-2 h-11" disabled={loginMut.isPending}>
                  {loginMut.isPending ? <Spinner /> : <>登录 <ArrowRight size={16} /></>}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <Link to="/reset-password" className="hover:underline" style={{ color: 'var(--accent-primary)' }}>忘记密码？</Link>
                  <button type="button" onClick={() => setTab('register')} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
                    没有账号？<span style={{ color: 'var(--accent-primary)' }}>去注册</span>
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-3.5" onSubmit={onRegister}>
                <Field icon={<UserCircle2 size={17} />} label="用户名">
                  <input type="text" value={rUsername} onChange={(e) => setRUsername(e.target.value)} placeholder="leaf" className="input-base" />
                </Field>
                <Field icon={<UserCircle2 size={17} />} label="昵称（可选）">
                  <input type="text" value={rNickname} onChange={(e) => setRNickname(e.target.value)} placeholder="叶同学" className="input-base" />
                </Field>
                <Field icon={<Mail size={17} />} label="邮箱">
                  <input type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} placeholder="leaf@example.com" className="input-base" />
                </Field>
                <Field icon={<Lock size={17} />} label="密码">
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={rPassword} onChange={(e) => setRPassword(e.target.value)} placeholder="至少 6 位" className="input-base pr-10" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-surface-alt)]" style={{ color: 'var(--text-muted)' }}>
                      {showPwd ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </Field>
                <Field icon={<ShieldCheck size={17} />} label="图形验证码">
                  <div className="flex gap-2 items-center">
                    <input type="text" value={rCode} onChange={(e) => setRCode(e.target.value)} placeholder="输入图中字符" className="input-base flex-1" maxLength={4} />
                    <Captcha ref={captchaRef} />
                  </div>
                </Field>

                <button className="btn btn-primary w-full justify-center gap-2 h-11 mt-1" disabled={registerMut.isPending}>
                  {registerMut.isPending ? <Spinner /> : <>注册并登录 <ArrowRight size={16} /></>}
                </button>

                <p className="text-center text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                  已有账号？
                  <button type="button" onClick={() => setTab('login')} className="ml-1 hover:underline" style={{ color: 'var(--accent-primary)' }}>去登录</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.t} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function TabBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-all"
      style={{
        color: active ? 'white' : 'var(--text-muted)',
        background: active ? 'var(--accent-primary)' : 'transparent',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs mb-1.5 inline-flex items-center gap-1.5 font-medium" style={{ color: 'var(--text-subtle)' }}>
        <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
        {label}
      </div>
      {children}
    </label>
  )
}
