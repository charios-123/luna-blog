import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useUserStore, selectIsLoggedIn, selectIsAdmin, selectUsername, selectAvatar } from '@/stores/user'
import { useTheme } from '@/hooks/useTheme'
import { useState } from 'react'
import { Menu, X, Moon, Sun, LogOut, User as UserIcon, Settings, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/',           label: '首页' },
  { to: '/articles',   label: '文章' },
  { to: '/archive',    label: '归档' },
  { to: '/notes',      label: '笔记' },
  { to: '/guestbook',  label: '留言板' },
  { to: '/about',      label: '关于' },
  { to: '/stats',      label: '统计' },
]

export default function Header() {
  const isLoggedIn = useUserStore(selectIsLoggedIn)
  const isAdmin = useUserStore(selectIsAdmin)
  const username = useUserStore(selectUsername)
  const userAvatar = useUserStore(selectAvatar)
  const logout = useUserStore((s) => s.logout)
  const navigate = useNavigate()

  // 未登录时获取博主头像作为 Logo
  const { data: blogger } = useQuery({
    queryKey: ['blogger-info'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/blog/blogger')
        if (!res.ok) return null
        const json = await res.json()
        return json.data || null
      } catch { return null }
    },
    enabled: !isLoggedIn,
    staleTime: 30 * 60 * 1000,
  })

  const logoAvatar = isLoggedIn ? userAvatar : (blogger?.avatar || '')

  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 nav-glass">
      <div className="container-page h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          {logoAvatar ? (
            <img
              src={logoAvatar}
              alt="logo"
              className="w-11 h-11 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform border"
              style={{ borderColor: 'var(--color-leaf-400)', boxShadow: 'var(--shadow-sm)' }}
            />
          ) : (
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--color-leaf-700))',
                color: 'white',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Moon size={22} fill="currentColor" />
            </div>
          )}
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-lg" style={{ color: 'var(--text-heading)' }}>
              Luna Blog
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'px-4 py-2.5 rounded-[var(--radius-md)] text-base font-medium transition-colors',
                  isActive
                    ? 'nav-link-active'
                    : 'hover:bg-[var(--bg-surface-alt)]',
                )
              }
              style={({ isActive }) => ({
                color: isActive ? undefined : 'var(--text-muted)',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="btn btn-ghost"
            aria-label={theme === 'dark' ? '切换到亮色' : '切换到暗色'}
            title={theme === 'dark' ? '切换到亮色' : '切换到暗色'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAdmin && (
            <Link to="/admin/articles" className="hidden sm:inline-flex btn btn-outline">
              <Pencil size={16} />
              <span>后台</span>
            </Link>
          )}

          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 hover:bg-[var(--bg-surface-alt)] transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  {userAvatar ? (
                    <img src={userAvatar} alt={username} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--color-leaf-700))' }}
                    >
                      {username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium" style={{ color: 'var(--text-fg)' }}>
                  {username}
                </span>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-2 w-48 rounded-[var(--radius-lg)] border shadow-lg z-20 animate-[fade-down_0.2s_ease-out]"
                    style={{
                      background: 'var(--bg-surface)',
                      borderColor: 'var(--border-default)',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  >
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--bg-surface-alt)] rounded-t-[var(--radius-lg)]"
                      style={{ color: 'var(--text-fg)' }}
                    >
                      <UserIcon size={16} />
                      个人中心
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin/articles"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--bg-surface-alt)]"
                        style={{ color: 'var(--text-fg)' }}
                      >
                        <Settings size={16} />
                        后台管理
                      </Link>
                    )}
                    <div className="my-1 h-px" style={{ background: 'var(--border-muted)' }} />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--bg-surface-alt)] rounded-b-[var(--radius-lg)]"
                      style={{ color: 'var(--accent-danger)' }}
                    >
                      <LogOut size={16} />
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary">
              登录
            </Link>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="btn btn-ghost md:hidden"
            aria-label="菜单"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div
          className="md:hidden border-t animate-[fade-down_0.2s_ease-out]"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <nav className="container-page py-3 flex flex-col">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                cn(
                  'px-4 py-3 rounded-[var(--radius-md)] text-sm font-medium transition-colors',
                    isActive ? 'nav-link-active' : 'hover:bg-[var(--bg-surface-alt)]',
                  )
                }
                style={({ isActive }) => ({
                  color: isActive ? undefined : 'var(--text-muted)',
                })}
              >
                {item.label}
              </NavLink>
            ))}
            {isAdmin && (
              <Link
                to="/admin/articles"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-[var(--accent-primary)]"
              >
                📝 后台管理
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
