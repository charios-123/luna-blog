# Luna Blog

一个基于 Go + React 的全栈博客系统，支持文章发布、分类归档、评论留言、AI 问答、阅读统计等功能。

- **后端**：Go + Gin，参考 Kratos 分层设计（server / service / biz / data / model）
- **前端**：React 19 + Vite + TypeScript + Tailwind CSS，位于 `web/` 目录
- **数据库**：MySQL 8 + Redis 7

## 目录

- [Luna Blog](#luna-blog)
  - [目录](#目录)
  - [技术栈](#技术栈)
  - [项目架构](#项目架构)
  - [目录结构](#目录结构)
  - [快速开始](#快速开始)
    - [环境要求](#环境要求)
    - [后端启动](#后端启动)
    - [前端启动](#前端启动)
    - [构建产物](#构建产物)
  - [配置说明](#配置说明)
  - [API 文档](#api-文档)
  - [运维工具](#运维工具)
  - [主要功能](#主要功能)

## 技术栈

**后端**

- 语言：Go 1.24
- Web 框架：Gin
- ORM：GORM
- 数据库：MySQL 8.0
- 缓存/在线状态：Redis 7
- 认证：JWT（bcrypt 密码加密）
- 配置管理：Viper
- 依赖注入：Wire
- API 文档：Swagger（swaggo）

**前端**（`web/`）

- React 19 + TypeScript
- 构建工具：Vite 6
- 样式：Tailwind CSS v4
- 状态管理：Zustand
- 数据请求：TanStack React Query + Axios
- 路由：React Router 7
- Markdown 渲染：react-markdown + rehype-highlight + remark-gfm

## 项目架构

```
┌─────────────────┐
│   HTTP Layer    │  Gin 路由 + 中间件（server/）
├─────────────────┤
│  Service Layer  │  请求校验、参数绑定、响应封装（service/）
├─────────────────┤
│    Biz Layer    │  业务逻辑核心，与 HTTP 无关（biz/）
├─────────────────┤
│   Data Layer    │  数据访问、仓储实现（data/）
├─────────────────┤
│  Model Layer    │  数据模型 PO / DTO（model/）
└─────────────────┘
```

前端单页应用通过 `/blog/*` 前缀请求博客前台接口，通过 `/api/*`（开发代理）请求管理后台接口。

## 目录结构

```
├── main.go                 # 后端入口（含 Swagger 注释）
├── cmd/
│   ├── app.go              # 应用组装：依赖注入、启动 HTTP 服务、定时任务
│   ├── injector.go         # Wire 注入器
│   ├── wire.go             # Wire 依赖声明
│   └── fix_*/ recrawl_* / restore_*   # 一次性运维工具（见「运维工具」）
├── config/
│   └── config.go           # Viper 配置加载 + 数据库/Redis 初始化
├── internal/
│   ├── server/             # HTTP 层：路由注册、中间件
│   ├── service/            # 服务层：博客、文章、评论、认证、AI、统计等
│   ├── biz/                # 业务层：文章、用户、评论、CSDN 爬虫、AI 等
│   ├── data/               # 数据层：GORM 仓储实现
│   └── model/
│       ├── po/             # 数据库模型（Article、User、Comment 等）
│       └── dto/            # 请求/响应传输对象
├── pkg/                    # 通用工具：jwt、logger、markdown、redis、response 等
├── docs/                   # Swagger 生成产物 + 历史文档
├── web/                    # 前端（React 单页应用）
│   ├── src/
│   │   ├── api/            # 接口封装（axios）
│   │   ├── components/     # 通用组件（Header、ArticleCard、widgets 等）
│   │   ├── views/          # 页面（Home、ArticleDetail、admin/ 后台等）
│   │   ├── stores/         # Zustand 状态（user）
│   │   ├── hooks/          # 自定义 Hooks（heartbeat、theme、seo 等）
│   │   ├── router/         # 路由配置
│   │   └── config/         # 站点配置
│   └── vite.config.ts      # Vite 配置（含后端代理 http://localhost:8888）
├── tools/
│   └── reset_db.go         # 数据库重置工具
├── config.yaml             # 后端配置
└── go.mod / go.sum
```

## 快速开始

### 环境要求

- Go 1.24+
- Node.js 18+
- MySQL 8.0（本地 3306，库名 `leaf_admin`）
- Redis 7（本地 6379）

### 后端启动

```bash
# 1. 修改 config.yaml 中的数据库连接等配置

# 2. 启动后端（AI 功能需注入环境变量）
$env:AI_API_KEY = "你的 DeepSeek API Key"
go run main.go
# 服务启动于 http://localhost:8888
```

### 前端启动

```bash
cd web
npm install
npm run dev
# 访问 http://localhost:5173
```

前端开发代理已配置，`/blog/*`、`/api/*` 请求自动转发到后端 8888 端口。

### 构建产物

```bash
# 后端编译到 bin/ 目录
go build -o bin/luna-blog.exe .

# 前端构建
cd web && npm run build
```

## 配置说明

后端配置集中在 `config.yaml`：

| 配置项 | 说明 |
|--------|------|
| `database` | MySQL 连接（host、port、user、password、dbname）|
| `redis` | Redis 连接地址 |
| `server` | 服务端口、运行模式 |
| `ai` | AI 服务商（DeepSeek）、base_url、model |

**安全提示**：AI 的 API Key 不写入配置文件，通过环境变量 `AI_API_KEY` 注入，读取时若环境变量存在则覆盖配置项。

## API 文档

启动后端后访问 Swagger 在线文档：

- Swagger UI：http://localhost:8888/swagger/index.html

更新文档（修改接口注释后重新生成）：

```bash
swag init -g cmd/app.go -o docs
```

## 运维工具

`cmd/` 和 `tools/` 下包含一些一次性运维/调试工具（不影响服务运行，仅按需执行）：

| 工具 | 用途 |
|------|------|
| `cmd/recrawl_articles` | 重新爬取指定 CSDN 文章 |
| `cmd/restore_article` | 从原文 URL 恢复文章内容 |
| `cmd/fix_images` | 修复文章图片（本地化/清理）|
| `cmd/fix_article_format` | 批量修复文章格式 |
| `cmd/fix_bold_markers` | 修复 Markdown 加粗标记 |
| `cmd/fix_duplicate_summary` | 清理重复摘要 |
| `tools/reset_db.go` | 重置数据库 |

## 主要功能

- 文章管理：发布/编辑/删除、Markdown 渲染、置顶、归档、搜索
- 分类体系：按技术栈分类（Linux、Kubernetes、Docker、Go、Java 等）
- 评论互动：游客评论 + 登录用户评论、回复、点赞
- 留言板：游客留言
- AI 问答：基于文章内容的 DeepSeek 对话（`/blog/articles/:id/ai/chat`）
- 用户体系：注册、登录、资料编辑、管理员后台
- 数据统计：阅读量、点赞数、在线人数、访问统计
- 定时爬虫：每 2 小时抓取 CSDN 技术文章入库
