package server

import (
	"fmt"

	"github.com/charios-123/luna-blog/config"
	"github.com/charios-123/luna-blog/internal/biz"
	"github.com/charios-123/luna-blog/internal/data"
	"github.com/charios-123/luna-blog/internal/server/middleware"
	"github.com/charios-123/luna-blog/internal/service"
	"github.com/charios-123/luna-blog/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/charios-123/luna-blog/docs" // Swagger 文档
)

// HTTPServer HTTP 服务器
type HTTPServer struct {
	engine *gin.Engine
	addr   string
}

// NewHTTPServer 创建 HTTP 服务器
func NewHTTPServer(b *biz.Biz, d *data.Data) *HTTPServer {
	// 设置 Gin 模式
	mode := viper.GetString("server.mode")
	if mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	} else if mode == "test" {
		gin.SetMode(gin.TestMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	r := gin.New()

	// 全局中间件
	r.Use(logger.GinLogger())
	r.Use(logger.GinRecovery())
	r.Use(middleware.CORS())

	// 静态文件服务（用于本地文件上传）
	r.Static("/uploads", "./uploads")

	// Swagger 文档路由
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// 健康检查
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// 初始化服务
	authService := service.NewAuthService(b.AuthUseCase)
	articleService := service.NewArticleService(b.ArticleUseCase)
	categoryService := service.NewCategoryService(b.CategoryUseCase)
	tagService := service.NewTagService(b.TagUseCase)
	commentService := service.NewCommentService(b.CommentUseCase)
	chapterService := service.NewChapterService(d)
	statsService := service.NewStatsService(d)
	settingsService := service.NewSettingsService(d)
	fileService := service.NewFileService(d)
	blogService := service.NewBlogService(b.BlogUseCase)
	aiService := service.NewAIService(b.AIUseCase)
	weatherService := service.NewWeatherService(config.AppConfig.Weather.APIKey, config.AppConfig.Weather.Host, config.AppConfig.Weather.City)
	onlineService := service.NewOnlineService(d)
	visitService := service.NewVisitService(d)
	analyticsService := service.NewAnalyticsService(d)

	// 注册路由
	registerRoutes(r, authService, articleService, categoryService, tagService, commentService, chapterService, statsService, settingsService, fileService, blogService, aiService, weatherService, onlineService, visitService, analyticsService)

	// 获取端口
	port := viper.GetInt("server.port")
	addr := fmt.Sprintf(":%d", port)

	return &HTTPServer{
		engine: r,
		addr:   addr,
	}
}

// Start 启动 HTTP 服务器
func (s *HTTPServer) Start() error {
	return s.engine.Run(s.addr)
}

// Stop 停止 HTTP 服务器
func (s *HTTPServer) Stop() error {
	// 这里可以添加优雅关闭的逻辑
	return nil
}

// GetEngine 获取 Gin Engine（用于测试）
func (s *HTTPServer) GetEngine() *gin.Engine {
	return s.engine
}
