package biz

import (
	"github.com/charios-123/luna-blog/internal/data"
)

// Biz 业务逻辑层结构
type Biz struct {
	ArticleUseCase  ArticleUseCase
	CategoryUseCase CategoryUseCase
	TagUseCase      TagUseCase
	CommentUseCase  CommentUseCase
	BlogUseCase     BlogUseCase
	AIUseCase       AIUseCase
}

// NewBiz 创建业务逻辑层实例
func NewBiz(d *data.Data) *Biz {
	return &Biz{
		ArticleUseCase:  NewArticleUseCase(d),
		CategoryUseCase: NewCategoryUseCase(d),
		TagUseCase:      NewTagUseCase(d),
		CommentUseCase:  NewCommentUseCase(d),
		BlogUseCase:     NewBlogUseCase(d),
		AIUseCase:       NewAIUseCase(d),
	}
}
