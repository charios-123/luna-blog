package server

import (
	"github.com/charios-123/luna-blog/internal/server/middleware"
	"github.com/charios-123/luna-blog/internal/service"
	"github.com/gin-gonic/gin"
)

// registerRoutes 注册路由
func registerRoutes(
	r *gin.Engine,
	articleService *service.ArticleService,
	categoryService *service.CategoryService,
	tagService *service.TagService,
	commentService *service.CommentService,
	statsService *service.StatsService,
	fileService *service.FileService,
	blogService *service.BlogService,
	aiService *service.AIService,
	weatherService *service.WeatherService,
	onlineService *service.OnlineService,
	visitService *service.VisitService,
	analyticsService *service.AnalyticsService,
) {
	// 公开 XML 输出。生产环境如果前端托管在根路径，需要在 Nginx 将这些路径转发到 API。
	r.GET("/sitemap.xml", articleService.Sitemap)
	r.GET("/feed.xml", articleService.RSS)
	r.GET("/rss.xml", articleService.RSS)

	// 博客前台认证路由（不需要 JWT 验证）
	blogAuth := r.Group("/blog/auth")
	{
		blogAuth.POST("/register", blogService.Register)
		blogAuth.POST("/login", blogService.Login)
		blogAuth.GET("/me", middleware.JWTAuth(), blogService.GetUserInfo)
		blogAuth.PUT("/profile", middleware.JWTAuth(), blogService.UpdateProfile)
		blogAuth.PUT("/password", middleware.JWTAuth(), blogService.ChangePassword)
	}

	// 博客公开路由（不需要认证）
	blog := r.Group("/blog")
	{
		// 文章相关
		blog.GET("/articles", articleService.List)            // 文章列表
		blog.GET("/articles/search", articleService.Search)   // 搜索文章
		blog.GET("/articles/archive", articleService.Archive) // 归档文章

		// 分类和标签
		blog.GET("/categories", categoryService.List) // 分类列表
		blog.GET("/tags", tagService.List)            // 标签列表

		// 订阅和站点地图（兼容 /api/blog/* 转发场景）
		blog.GET("/sitemap.xml", articleService.Sitemap)
		blog.GET("/feed.xml", articleService.RSS)
		blog.GET("/rss.xml", articleService.RSS)

		// 统计
		blog.GET("/stats", statsService.GetStats)                    // 站点统计
		blog.GET("/stats/hot-articles", statsService.GetHotArticles) // 热门文章

		// 博主信息（关于页面使用）
		blog.GET("/blogger", blogService.GetBloggerInfo) // 获取博主信息

		// 文章 AI 问答
		blog.POST("/articles/:id/ai/chat", aiService.ChatAboutArticleStream) // 基于文章内容 AI 问答(SSE 流式)

		// 天气（后端代理和风天气，避免暴露 API Key）
		blog.GET("/weather", weatherService.GetWeather) // 获取天气
	}

	// 博客可选认证路由（支持登录和未登录状态）
	blogOptionalAuth := r.Group("/blog")
	blogOptionalAuth.Use(middleware.OptionalJWTAuth())
	{
		// 在线追踪（登录用户按 UserID，未登录按 IP）
		blogOptionalAuth.POST("/heartbeat", onlineService.RecordHeartbeat) // 心跳接口
		blogOptionalAuth.POST("/visit", visitService.RecordVisitDuration)  // 记录访问时长

		// 文章详情（登录用户可查看点赞收藏状态）
		blogOptionalAuth.GET("/articles/:id", blogService.GetArticleDetail)
		// 文章评论（登录用户可查看点赞状态）
		blogOptionalAuth.GET("/articles/:id/comments", blogService.GetArticleComments)
		// 发布评论（游客 user_id=0,登录用户取真实 ID）
		blogOptionalAuth.POST("/comments", blogService.CreateComment)
		// 留言板（登录用户可查看点赞状态）
		blogOptionalAuth.GET("/guestbook", blogService.GetGuestbookMessages)
	}

	// 博客需要认证的路由
	blogAuthed := r.Group("/blog")
	blogAuthed.Use(middleware.JWTAuth())
	{
		// 点赞
		blogAuthed.POST("/articles/:id/like", blogService.LikeArticle)
		blogAuthed.DELETE("/articles/:id/like", blogService.UnlikeArticle)

		// 收藏
		blogAuthed.POST("/articles/:id/favorite", blogService.FavoriteArticle)
		blogAuthed.DELETE("/articles/:id/favorite", blogService.UnfavoriteArticle)

		// 评论
		blogAuthed.POST("/comments/:id/like", blogService.LikeComment)
		blogAuthed.DELETE("/comments/:id/like", blogService.UnlikeComment)
		blogAuthed.DELETE("/comments/:id", blogService.DeleteComment)

		// 留言板
		blogAuthed.POST("/guestbook", blogService.CreateGuestbookMessage)
		blogAuthed.DELETE("/guestbook/:id", blogService.DeleteGuestbookMessage)
	}

	// 管理后台 API 路由（需要 JWT 验证）
	api := r.Group("/")
	api.Use(middleware.JWTAuth())
	{
		// 文章管理
		articles := api.Group("/articles")
		{
			articles.GET("", articleService.List)
			articles.GET("/:id", articleService.GetByID)
			articles.POST("", articleService.Create)
			articles.POST("/batch-delete", articleService.BatchDelete)
			articles.PUT("/:id", articleService.Update)
			articles.PATCH("/:id/status", articleService.UpdateStatus)
			articles.PATCH("/:id/pin", articleService.UpdatePin)
			articles.DELETE("/:id", articleService.Delete)
		}

		// 评论管理
		comments := api.Group("/comments")
		{
			comments.GET("", commentService.List)
			comments.DELETE("/:id", commentService.Delete)
			comments.PATCH("/:id/status", commentService.UpdateStatus)
		}

		// 标签管理
		tags := api.Group("/tags")
		{
			tags.GET("", tagService.List)
			tags.POST("", tagService.Create)
			tags.DELETE("/:id", tagService.Delete)
		}

		// 分类管理
		categories := api.Group("/categories")
		{
			categories.GET("", categoryService.List)
			categories.POST("", categoryService.Create)
			categories.DELETE("/:id", categoryService.Delete)
		}

		// 数据分析
		analytics := api.Group("/analytics")
		{
			analytics.GET("/visits/7days", analyticsService.Get7DaysVisits)
		}

		// 文件上传
		files := api.Group("/files")
		{
			files.POST("/upload", fileService.Upload)
		}
	}
}
