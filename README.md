# Leaf API

一个基于 Go + Gin 开发的博客系统后端服务，项目架构参考了 [Kratos](https://go-kratos.dev/) 的分层设计理念，同时结合实际业务需求做了适配和简化。

## 📋 目录

- [技术栈](#-技术栈)
- [项目架构](#-项目架构)
- [目录结构](#-目录结构)
- [快速开始](#-快速开始)
  - [环境要求](#环境要求)
  - [本地开发](#本地开发)
- [部署方式](#-部署方式)
  - [裸部署](#裸部署)
  - [Docker 部署](#docker-部署)
  - [Docker Compose 部署](#docker-compose-部署)
  - [Kubernetes 部署](#kubernetes-部署)
- [配置说明](#-配置说明)
- [API 文档](#-api-文档)
  - [Swagger 文档](#swagger-文档推荐)
  - [管理后台 API](#管理后台-api)
  - [博客前台 API](#博客前台-api)
- [开发相关](#-开发相关)

## 🛠 技术栈

- **语言**: Go 1.21+
- **Web 框架**: Gin
- **ORM**: GORM
- **数据库**: MySQL 8.0
- **缓存**: Redis 7.x
- **对象存储**: 阿里云 OSS
- **认证**: JWT
- **日志**: Logrus + Lumberjack
- **配置管理**: Viper
- **依赖注入**: Wire

## 🏗 项目架构

项目采用了类似 Kratos 的分层架构设计，不过做了一些简化和调整以适应实际需求：

```
┌─────────────────┐
│   HTTP Layer    │  Gin 路由 + 中间件
├─────────────────┤
│  Service Layer  │  处理 HTTP 请求
├─────────────────┤
│    Biz Layer    │  业务逻辑层（核心）
├─────────────────┤
│   Data Layer    │  数据访问层
├─────────────────┤
│  Model Layer    │  数据模型（PO/DTO）
└─────────────────┘
```

简单说下各层的职责：

- **HTTP Layer**: 路由配置、中间件（JWT 认证、日志、跨域等）
- **Service Layer**: 接收 HTTP 请求，做参数验证，调用 Biz 层处理，返回响应
- **Biz Layer**: 这是核心，所有业务逻辑都在这里，保持与 HTTP 无关
- **Data Layer**: 负责和数据库、Redis 打交道，用的是 Repository 模式
- **Model Layer**: 数据模型，分为 PO（数据库模型）和 DTO（接口传输对象）

这样分层的好处是职责清晰，改动某一层不会影响其他层，测试起来也方便。

## 📂 目录结构

```
.
├── cmd/                    # 命令行入口
│   ├── app.go             # 应用初始化
│   ├── injector.go        # 依赖注入（Wire生成）
│   ├── wire.go            # Wire配置
│   └── fix_images/        # 图片修复工具
├── config/                 # 配置管理
│   └── config.go          # 配置结构定义
├── deploy/                 # 部署配置
│   ├── docker/            # Docker相关
│   ├── k8s/               # Kubernetes配置
│   ├── nginx/             # Nginx配置
│   └── scripts/           # 部署脚本
├── docs/                   # 文档
├── internal/               # 内部代码（不对外暴露）
│   ├── biz/               # 业务逻辑层（UseCase）
│   │   ├── article.go     # 文章业务逻辑
│   │   ├── auth.go        # 认证业务逻辑
│   │   ├── blog.go        # 博客业务逻辑
│   │   └── user.go        # 用户业务逻辑
│   ├── data/              # 数据访问层（Repository）
│   │   ├── article.go     # 文章数据访问
│   │   ├── user.go        # 用户数据访问
│   │   ├── category.go    # 分类数据访问
│   │   ├── tag.go         # 标签数据访问
│   │   └── comment.go     # 评论数据访问
│   ├── model/             # 数据模型
│   │   ├── dto/           # 数据传输对象（请求/响应）
│   │   └── po/            # 持久化对象（数据库模型）
│   ├── server/            # HTTP服务器
│   │   ├── http.go        # HTTP服务器初始化
│   │   ├── router.go      # 路由配置
│   │   └── middleware/    # 中间件
│   └── service/           # 服务层（HTTP Handler）
│       ├── article.go     # 文章服务
│       ├── auth.go        # 认证服务
│       ├── blog.go        # 博客服务
│       ├── user.go        # 用户服务
│       ├── category.go    # 分类服务
│       ├── tag.go         # 标签服务
│       ├── comment.go     # 评论服务
│       ├── chapter.go     # 章节服务
│       ├── stats.go       # 统计服务
│       ├── settings.go    # 设置服务
│       └── file.go        # 文件服务
├── pkg/                    # 公共包（可复用）
│   ├── jwt/               # JWT认证
│   ├── logger/            # 日志工具
│   ├── markdown/          # Markdown处理
│   ├── oss/               # 对象存储（阿里云OSS）
│   ├── redis/             # Redis客户端
│   └── response/          # HTTP响应封装
├── tools/                  # 工具脚本
│   └── reset_db.go        # 数据库重置工具
├── uploads/                # 上传文件目录
├── config.yaml             # 配置文件
├── main.go                 # 程序入口
├── Dockerfile              # Docker镜像构建文件
├── docker-compose.yml      # Docker Compose配置
└── README.md               # 项目文档
```

## 🚀 快速开始

### 环境要求

- Go 1.21 或更高版本
- MySQL 8.0+
- Redis 7.x

### 本地开发

**1. 克隆项目**

```bash
git clone https://github.com/ydcloud-dy/leaf-api.git
cd leaf-api
```

**2. 安装依赖**

```bash
export GOPROXY=https://goproxy.cn,direct
go mod download
```

**3. 配置数据库**

修改 `config.yaml`，把数据库配置改成你本地的：

```yaml
database:
  host: 127.0.0.1
  port: 3306
  user: root
  password: your_password
  dbname: leaf_admin
  charset: utf8mb4
```

**4. 启动必要服务**

```bash
# 启动 MySQL
mysql.server start

# 启动 Redis
redis-server
```

**5. 运行项目**

```bash
# 直接运行
go run main.go

# 或者编译后运行
go build -o leaf-api .
./leaf-api
```

**6. 验证服务**

- API 服务: http://localhost:8888
- 健康检查: http://localhost:8888/ping

如果能访问通，说明启动成功了。

## 📦 部署方式

### 裸部署

如果你想直接部署在服务器上，可以用我提供的自动化脚本：

```bash
chmod +x deploy/scripts/deploy.sh
./deploy/scripts/deploy.sh
```

当然也可以手动操作：

```bash
# 编译
go build -o leaf-api .

# 创建目录
mkdir -p logs uploads

# 记得先配置好 config.yaml

# 启动服务
./leaf-api

# 后台运行的话
nohup ./leaf-api > server.log 2>&1 &
```

### Docker 部署

先构建镜像：

```bash
docker build -t leaf-api:latest .
```

然后运行容器：

```bash
docker run -d \
  --name leaf-api \
  -p 8888:8888 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/logs:/app/logs \
  -e DB_HOST=your_mysql_host \
  -e REDIS_HOST=your_redis_host \
  leaf-api:latest
```

记得把 MySQL 和 Redis 的地址换成实际的。

### Docker Compose 部署

**推荐使用 Docker Compose 一键部署后端服务及其依赖**

```bash
# 启动所有服务（API、MySQL、Redis）
docker-compose up -d

# 看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 如果想清理数据重新开始
docker-compose down -v
```

启动后可以访问：
- API 服务: http://localhost:8888
- Swagger 文档: http://localhost:8888/swagger/index.html

### Kubernetes 部署

如果要部署到 K8s，按下面步骤来：

**创建命名空间和 PVC**

```bash
kubectl apply -f deploy/k8s/pvc.yaml
```

**部署应用**

```bash
kubectl apply -f deploy/k8s/deployment.yaml
```

**检查状态**

```bash
# 看 Pod 状态
kubectl get pods -n leaf-blog

# 看服务
kubectl get svc -n leaf-blog

# 看日志
kubectl logs -f <pod-name> -n leaf-blog
```

**访问服务**

```bash
# 测试的话可以用端口转发
kubectl port-forward svc/leaf-api-service 8888:8888 -n leaf-blog

# 生产环境建议配置 Ingress
```

默认平台账号密码：admin/admin123
## ⚙️ 配置说明

### 主要配置项

```yaml
server:
  port: 8888           # 服务端口
  mode: release        # 运行模式: debug, release, test

database:
  host: 127.0.0.1      # 数据库地址
  port: 3306           # 数据库端口
  user: root           # 数据库用户
  password: 123456     # 数据库密码
  dbname: leaf_admin   # 数据库名称
  charset: utf8mb4     # 字符集

jwt:
  secret: your_secret  # JWT 密钥
  expire: 24           # Token 过期时间（小时）

oss:                   # 阿里云 OSS 配置
  endpoint: oss-cn-hangzhou.aliyuncs.com
  access_key_id: your_key_id
  access_key_secret: your_key_secret
  bucket_name: your_bucket
  base_url: https://your-bucket.oss-cn-hangzhou.aliyuncs.com

redis:
  host: 127.0.0.1      # Redis 地址
  port: 6379           # Redis 端口
  password:            # Redis 密码
  db: 0                # Redis 数据库
  pool_size: 10        # 连接池大小

log:
  level: debug         # 日志级别: debug, info, warn, error
  format: text         # 日志格式: text, json
  output: stdout       # 输出: stdout, file
  file_path: logs/app.log
  max_size: 100        # 单个文件大小 (MB)
  max_backups: 3       # 保留文件数量
  max_age: 7           # 保留天数
```

### 环境变量

也可以用环境变量覆盖配置文件，部署时比较方便：

- `DB_HOST` - 数据库地址
- `DB_PORT` - 数据库端口
- `REDIS_HOST` - Redis 地址
- `REDIS_PORT` - Redis 端口

## 📖 API 文档

项目分为管理后台和博客前台两套 API，下面是详细说明。

### Swagger 文档（推荐）

项目已集成 Swagger，启动服务后可以直接访问交互式 API 文档。

**访问地址**：
- **Swagger UI**: http://localhost:8888/swagger/index.html （推荐，可视化界面）
- **API JSON**: http://localhost:8888/swagger/doc.json

**功能特点**：
- 📖 自动生成的 API 文档，与代码保持同步
- 🧪 可以直接在页面上测试接口
- 🔐 支持 JWT 认证测试
- 📝 详细的请求/响应示例

**快速开始**：
1. 启动服务：`./leaf-api`
2. 打开浏览器访问：http://localhost:8888/swagger/index.html
3. 点击接口可查看详情，点击 "Try it out" 可测试

**添加新接口文档**：
```bash
# 1. 在代码中添加 Swagger 注释（参考 internal/service/auth.go）
# 2. 重新生成文档
swag init
# 3. 重启服务
```

详细使用说明请查看：[SWAGGER_USAGE.md](./SWAGGER_USAGE.md)

---

### 管理后台 API

管理后台的接口大部分都需要登录，请求时要带上 JWT Token。

#### 认证相关 `/auth`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| POST | `/auth/login` | 管理员登录 | ✗ |
| POST | `/auth/logout` | 管理员登出 | ✗ |
| GET | `/auth/profile` | 获取当前管理员信息 | ✓ |
| PUT | `/auth/profile` | 更新当前管理员信息 | ✓ |

#### 用户管理 `/users`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/users` | 获取用户列表 | ✓ |
| GET | `/users/:id` | 获取用户详情 | ✓ |
| POST | `/users` | 创建用户 | ✓ |
| PUT | `/users/:id` | 更新用户信息 | ✓ |
| DELETE | `/users/:id` | 删除用户 | ✓ |

#### 文章管理 `/articles`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/articles` | 获取文章列表 | ✓ |
| GET | `/articles/:id` | 获取文章详情 | ✓ |
| POST | `/articles` | 创建文章 | ✓ |
| POST | `/articles/import` | 批量导入 Markdown 文件 | ✓ |
| POST | `/articles/batch-update-cover` | 批量更新文章封面 | ✓ |
| POST | `/articles/batch-update-fields` | 批量更新文章字段 | ✓ |
| POST | `/articles/batch-delete` | 批量删除文章 | ✓ |
| PUT | `/articles/:id` | 更新文章 | ✓ |
| PATCH | `/articles/:id/status` | 更新文章状态（上下架） | ✓ |
| DELETE | `/articles/:id` | 删除文章 | ✓ |

#### 分类管理 `/categories`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/categories` | 获取分类列表 | ✓ |
| POST | `/categories` | 创建分类 | ✓ |
| DELETE | `/categories/:id` | 删除分类 | ✓ |

#### 标签管理 `/tags`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/tags` | 获取标签列表 | ✓ |
| POST | `/tags` | 创建标签 | ✓ |
| DELETE | `/tags/:id` | 删除标签 | ✓ |

#### 章节管理 `/chapters`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/chapters` | 获取章节列表 | ✓ |
| GET | `/chapters/:id` | 获取章节详情 | ✓ |
| POST | `/chapters` | 创建章节 | ✓ |
| PUT | `/chapters/:id` | 更新章节 | ✓ |
| DELETE | `/chapters/:id` | 删除章节 | ✓ |

#### 评论管理 `/comments`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/comments` | 获取评论列表 | ✓ |
| DELETE | `/comments/:id` | 删除评论 | ✓ |
| PATCH | `/comments/:id/status` | 更新评论状态 | ✓ |

#### 统计数据 `/stats`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/stats` | 获取站点统计数据 | ✓ |
| GET | `/stats/hot-articles` | 获取热门文章 | ✓ |

#### 系统设置 `/settings`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/settings` | 获取系统设置 | ✓ |
| PUT | `/settings` | 更新系统设置 | ✓ |

#### 文件管理 `/files`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| POST | `/files/upload` | 上传文件 | ✓ |
| GET | `/files` | 获取文件列表 | ✓ |
| DELETE | `/files/:id` | 删除文件 | ✓ |

---

### 博客前台 API

博客前台的接口大部分是公开的，部分功能（点赞、评论等）需要登录。

#### 认证相关 `/blog/auth`

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| POST | `/blog/auth/register` | 用户注册 | ✗ |
| POST | `/blog/auth/login` | 用户登录 | ✗ |
| GET | `/blog/auth/me` | 获取当前用户信息 | ✓ |
| PUT | `/blog/auth/profile` | 更新用户资料 | ✓ |
| PUT | `/blog/auth/password` | 修改密码 | ✓ |

#### 文章相关（公开）

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/blog/articles` | 获取文章列表 | ✗ |
| GET | `/blog/articles/search` | 搜索文章 | ✗ |
| GET | `/blog/articles/archive` | 文章归档 | ✗ |
| GET | `/blog/articles/:id` | 获取文章详情（可选认证） | 可选 |

#### 文章互动（需要认证）

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| POST | `/blog/articles/:id/like` | 点赞文章 | ✓ |
| DELETE | `/blog/articles/:id/like` | 取消点赞 | ✓ |
| POST | `/blog/articles/:id/favorite` | 收藏文章 | ✓ |
| DELETE | `/blog/articles/:id/favorite` | 取消收藏 | ✓ |

#### 评论相关

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/blog/articles/:id/comments` | 获取文章评论（可选认证） | 可选 |
| POST | `/blog/comments` | 发表评论 | ✓ |
| POST | `/blog/comments/:id/like` | 点赞评论 | ✓ |
| DELETE | `/blog/comments/:id/like` | 取消点赞评论 | ✓ |
| DELETE | `/blog/comments/:id` | 删除评论 | ✓ |

#### 留言板

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/blog/guestbook` | 获取留言列表（可选认证） | 可选 |
| POST | `/blog/guestbook` | 发表留言 | ✓ |

#### 分类和标签（公开）

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/blog/categories` | 获取分类列表 | ✗ |
| GET | `/blog/tags` | 获取标签列表 | ✗ |
| GET | `/blog/chapters/:tag` | 获取标签下的章节及文章 | ✗ |

#### 用户数据（需要认证）

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/blog/user/likes` | 获取用户点赞列表 | ✓ |
| GET | `/blog/user/favorites` | 获取用户收藏列表 | ✓ |
| GET | `/blog/user/stats` | 获取用户统计数据 | ✓ |

#### 统计和博主信息（公开）

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| GET | `/blog/stats` | 获取站点统计 | ✗ |
| GET | `/blog/stats/hot-articles` | 获取热门文章 | ✗ |
| GET | `/blog/blogger` | 获取博主信息 | ✗ |

#### 在线追踪（可选认证）

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|--------------|
| POST | `/blog/heartbeat` | 记录心跳（在线状态） | 可选 |
| POST | `/blog/visit` | 记录访问时长 | 可选 |

**说明**：
- ✓ 需要登录，请求头带上 `Authorization: Bearer <token>`
- ✗ 不需要登录
- 可选 表示登录和不登录都行，登录后能看到更多信息（比如点赞状态）

## 🔧 开发相关

### 运行测试

```bash
go test ./...
```

### 代码格式化

```bash
go fmt ./...
```

### 代码检查

```bash
go vet ./...
```

### 依赖注入

项目使用了 Google Wire 做依赖注入，如果修改了 `cmd/wire.go`，记得重新生成代码：

```bash
# 安装 wire（首次）
go install github.com/google/wire/cmd/wire@latest

# 生成依赖注入代码
cd cmd && wire
```

### 生成 API 文档

项目支持 Swagger 自动生成 API 文档：

```bash
# 安装 swag（首次）
go install github.com/swaggo/swag/cmd/swag@latest

# 生成文档
swag init

# 启动服务后访问
# http://localhost:8888/swagger/index.html
```

## 📝 说明

- 项目架构参考了 [Kratos](https://go-kratos.dev/) 框架的设计思想
- 使用 MIT 协议开源
- 如果对你有帮助，欢迎 Star ⭐

## 📞 反馈
如有问题或建议，请通过以下方式联系：
- 提交 [Issue](https://github.com/ydcloud-dy/leaf-ui-frontend/issues)
- 发送邮件至：dycloudlove@163.com

