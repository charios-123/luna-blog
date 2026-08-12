# Luna Blog 前端

基于 **React 19 + Vite + TypeScript + Tailwind CSS** 构建的博客前端，是 Luna Blog 项目的前端部分（后端见项目根目录 README）。

## 技术栈

- React 19 + TypeScript
- 构建工具：Vite 6
- 样式：Tailwind CSS v4
- 状态管理：Zustand
- 数据请求：TanStack React Query + Axios
- 路由：React Router 7
- Markdown 渲染：react-markdown + rehype-highlight + remark-gfm
- 图标：lucide-react

## 目录结构

```
web/
├── src/
│   ├── api/            # 接口封装（axios 请求 + React Query）
│   ├── components/     # 通用组件
│   │   ├── ui/         # 基础 UI（Spinner、Toast、EmptyAvatar 等）
│   │   └── widgets/    # 小组件（统计、天气、AI 聊天、资料卡等）
│   ├── views/          # 页面
│   │   └── admin/      # 管理后台页面
│   ├── layouts/        # 布局（MainLayout、AdminLayout）
│   ├── stores/         # Zustand 全局状态（user）
│   ├── hooks/          # 自定义 Hooks（theme、seo、heartbeat、visit 等）
│   ├── router/         # 路由配置
│   ├── config/         # 站点配置（site.ts）
│   └── lib/            # 工具函数
├── public/             # 静态资源（favicon、sitemap.xml、robots.txt）
├── scripts/            # 构建辅助脚本（生成 sitemap）
├── index.html
├── vite.config.ts      # Vite 配置（含后端代理）
└── package.json
```

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（默认端口 5173）
npm run dev

# 生产构建（输出到 dist/）
npm run build

# 预览生产构建
npm run preview
```

## 代理配置

开发模式下，[vite.config.ts](vite.config.ts) 将请求代理到后端：

| 请求前缀 | 代理目标 |
|---------|---------|
| `/blog/*` | `http://localhost:8888` |
| `/api/*` | `http://localhost:8888` |
| `/uploads/*` | `http://localhost:8888` |

后端需先启动在 8888 端口（见项目根 README）。

## 开发约定

- **API 响应规范化**：列表数据统一通过 `Array.isArray(data) ? data : (data?.list || [])` 处理，避免字段不一致导致渲染错误
- **请求拦截**：`api/request.ts` 的响应拦截器直接返回内层 `data`，简化业务代码
- **用户状态**：`stores/user.ts` 持久化到 localStorage，登录/登出通过它同步全局
- **主题**：`hooks/useTheme.ts` 管理亮/暗模式，CSS 变量定义在 `index.css`
- **Markdown**：文章正文与 AI 回答使用 `react-markdown`，代码块语法高亮（GitHub Dark 配色）

## 主要页面

| 路由 | 页面 |
|------|------|
| `/` | 首页 |
| `/articles` | 文章列表 |
| `/articles/:id` | 文章详情（含 TOC 目录、AI 问答）|
| `/archive` | 归档 |
| `/guestbook` | 留言板 |
| `/stats` | 数据统计 |
| `/about` | 关于 |
| `/profile` | 个人中心 |
| `/login` | 登录/注册 |
| `/admin/*` | 管理后台（文章、分类、标签、评论）|
