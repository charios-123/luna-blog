import { Link } from 'react-router-dom'
import { FileText, LayoutDashboard, FolderTree, MessageSquare } from 'lucide-react'
import { Outlet, NavLink } from 'react-router-dom'

const menu = [
  { to: '/admin/articles',   label: '文章管理', icon: FileText },
  { to: '/admin/categories', label: '分类管理', icon: FolderTree },
  { to: '/admin/comments',   label: '评论管理', icon: MessageSquare },
]

export default function AdminLayout() {
  return (
    <div className="container-page py-10 flex gap-6 items-start">
      <aside
        className="hidden md:block w-56 shrink-0 card p-3 sticky top-24"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <Link to="/" className="flex items-center gap-2 px-3 py-2 mb-2">
          <LayoutDashboard size={18} style={{ color: 'var(--accent-primary)' }} />
          <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>返回前台</span>
        </Link>
        <div className="mt-1 space-y-1">
          {menu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                  isActive ? 'nav-link-active' : 'hover:bg-[var(--bg-surface-alt)]'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? undefined : 'var(--text-muted)',
              })}
            >
              <m.icon size={17} />
              {m.label}
            </NavLink>
          ))}
        </div>
      </aside>

      <section className="flex-1 min-w-0">
        <Outlet />
      </section>
    </div>
  )
}
