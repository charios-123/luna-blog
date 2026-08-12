//go:build wireinject
// +build wireinject

package cmd

import (
	"github.com/google/wire"
	"github.com/charios-123/luna-blog/internal/biz"
	"github.com/charios-123/luna-blog/internal/data"
	"github.com/charios-123/luna-blog/internal/server"
	"gorm.io/gorm"
)

// InitApp 初始化应用
func InitApp(db *gorm.DB) (*server.HTTPServer, error) {
	wire.Build(
		// Data 层
		data.NewData,

		// Biz 层
		biz.NewBiz,

		// Server 层
		server.NewHTTPServer,
	)
	return nil, nil
}
