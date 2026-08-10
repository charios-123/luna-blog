import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Spinner from './components/ui/Spinner'
import { AppRoutes, RouteDef } from './router'
import { useUserStore } from './stores/user'
import { useEffect } from 'react'

/** 递归渲染路由，支持 children 嵌套 */
function renderRoutes(routes: RouteDef[]): React.ReactNode {
  return routes.map((r) => (
    <Route key={r.path} path={r.path} element={r.element}>
      {r.children && r.children.length > 0 && renderRoutes(r.children)}
    </Route>
  ))
}

export default function App() {
  // 启动时恢复用户信息（逻辑对齐 Vue 端 user.initUser()）
  const initUser = useUserStore((s) => s.initUser)
  useEffect(() => {
    initUser()
  }, [initUser])

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-app)' }}>
          <Spinner size="lg" />
        </div>
      }
    >
      <Routes>
        <Route element={<MainLayout />}>
          {renderRoutes(AppRoutes)}
        </Route>
        {/* 登录页独立布局（和 Vue 端一致） */}
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Suspense>
  )
}

const LoginPage = lazy(() => import('./views/Login'))
