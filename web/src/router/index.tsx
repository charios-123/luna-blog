import { lazy, ComponentType, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { routeSeo } from '@/config/site'
import { useUserStore, selectIsLoggedIn, selectIsAdmin } from '@/stores/user'
import { useSeo } from '@/hooks/useSeo'
import { useEffect } from 'react'

/* 页面组件，懒加载（和 Vue 端路由 import('@/views/...') 等价） */
const Home = lazy(() => import('@/views/Home'))
const Articles = lazy(() => import('@/views/Articles'))
const ArticleDetail = lazy(() => import('@/views/ArticleDetail'))
const Archive = lazy(() => import('@/views/Archive'))
const Notes = lazy(() => import('@/views/Notes'))
const Guestbook = lazy(() => import('@/views/Guestbook'))
const About = lazy(() => import('@/views/About'))
const Stats = lazy(() => import('@/views/Stats'))
const Profile = lazy(() => import('@/views/Profile'))

/* 管理员后台 */
const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const AdminArticles = lazy(() => import('@/views/admin/AdminArticles'))
const ArticleEditor = lazy(() => import('@/views/admin/ArticleEditor'))
const AdminCategories = lazy(() => import('@/views/admin/AdminCategories'))
const AdminTags = lazy(() => import('@/views/admin/AdminTags'))
const AdminComments = lazy(() => import('@/views/admin/AdminComments'))

interface RouteMeta {
  title?: string
  description?: string
  requiresAuth?: boolean
  requiresAdmin?: boolean
}

export interface RouteDef {
  path: string
  element: ReactNode
  meta?: RouteMeta
  children?: RouteDef[]
}

/** 需要登录 */
function RequireAuth({ children }: { children: ReactNode }) {
  const isLoggedIn = useUserStore(selectIsLoggedIn)
  const location = useLocation()
  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}

/** 需要管理员 */
function RequireAdmin({ children }: { children: ReactNode }) {
  const isLoggedIn = useUserStore(selectIsLoggedIn)
  const isAdmin = useUserStore(selectIsAdmin)
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location }} />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

/** SEO wrapper：和 Vue 端 beforeEach 中 setSeo 等价 */
function WithSeo({ meta, children }: { meta?: RouteMeta; children: ReactNode }) {
  useSeo({
    title: meta?.title,
    description: meta?.description,
    url: useLocation().pathname,
  })
  // 页面切换滚到顶部
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [loc.pathname])
  return <>{children}</>
}

/**
 * 路由表（和 Vue 端 router/index.js 结构一一对应，逻辑不变）
 * 管理员路由嵌套在 /admin 下，走 requiresAdmin 守卫，AdminLayout 的 <Outlet/> 渲染子路由
 */
export const AppRoutes: RouteDef[] = [
  { path: '',           element: <WithSeo meta={routeSeo.Home}><Home /></WithSeo> },
  { path: 'articles',   element: <WithSeo meta={routeSeo.Articles}><Articles /></WithSeo> },
  { path: 'articles/:id', element: <ArticleDetail /> }, // 组件内部设置 SEO
  { path: 'archive',    element: <WithSeo meta={routeSeo.Archive}><Archive /></WithSeo> },
  { path: 'notes/:tag?',element: <WithSeo meta={routeSeo.Notes}><Notes /></WithSeo> },
  { path: 'guestbook',  element: <WithSeo meta={routeSeo.Guestbook}><Guestbook /></WithSeo> },
  { path: 'about',      element: <WithSeo meta={routeSeo.About}><About /></WithSeo> },
  { path: 'stats',      element: <WithSeo meta={routeSeo.Stats}><Stats /></WithSeo> },
  { path: 'profile',    element: <RequireAuth><WithSeo meta={routeSeo.Profile}><Profile /></WithSeo></RequireAuth> },

  /* 管理员后台：嵌套路由，AdminLayout 内 <Outlet/> 渲染 */
  {
    path: 'admin',
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      { path: 'articles',             element: <AdminArticles /> },
      { path: 'articles/new',         element: <ArticleEditor /> },
      { path: 'articles/:id/edit',    element: <ArticleEditor /> },
      { path: 'categories',           element: <AdminCategories /> },
      { path: 'tags',                 element: <AdminTags /> },
      { path: 'comments',             element: <AdminComments /> },
    ],
  },
]
