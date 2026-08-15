package data

import (
	"sort"
	"time"

	"github.com/charios-123/luna-blog/internal/model/po"
	"gorm.io/gorm"
)

// ArticleRepo 文章仓储接口
type ArticleRepo interface {
	// Create 创建文章
	Create(article *po.Article) error
	// Update 更新文章
	Update(article *po.Article) error
	// Delete 删除文章
	Delete(id uint) error
	// FindByID 根据 ID 查询文章
	FindByID(id uint) (*po.Article, error)
	// FindByIDWithRelations 根据 ID 查询文章（包含关联数据）
	FindByIDWithRelations(id uint) (*po.Article, error)
	// FindByIDs 根据多个 ID 查询文章
	FindByIDs(ids []uint) ([]*po.Article, error)
	// List 查询文章列表
	List(page, limit int, categoryID, tagID, chapterID uint, status, keyword, sort string) ([]*po.Article, int64, error)
	// UpdateStatus 更新文章状态
	UpdateStatus(id uint, status int) error
	// CountPinned 统计当前置顶文章数量
	CountPinned() (int64, error)
	// ListPinned 查询已置顶文章
	ListPinned() ([]*po.Article, error)
	// UpdatePinned 更新文章置顶状态
	UpdatePinned(id uint, isPinned bool, pinSort int, pinnedAt *time.Time) error
	// IncrementViewCount 增加浏览量
	IncrementViewCount(id uint) error
	// IncrementLikeCount 增加点赞数
	IncrementLikeCount(id uint) error
	// DecrementLikeCount 减少点赞数
	DecrementLikeCount(id uint) error
	// IncrementFavoriteCount 增加收藏数
	IncrementFavoriteCount(id uint) error
	// DecrementFavoriteCount 减少收藏数
	DecrementFavoriteCount(id uint) error
	// IncrementCommentCount 增加评论数
	IncrementCommentCount(id uint) error
	// DecrementCommentCount 减少评论数
	DecrementCommentCount(id uint) error
	// AssociateTags 关联标签
	AssociateTags(articleID uint, tagIDs []uint) error
	// BatchDelete 批量删除
	BatchDelete(articleIDs []uint) error
	// GetRelatedArticles 获取相关文章
	GetRelatedArticles(id uint, limit int) ([]*po.Article, error)
	// ListPublished 获取已发布文章列表
	ListPublished(limit int) ([]*po.Article, error)
}

// articleRepo 文章仓储实现
type articleRepo struct {
	db *gorm.DB
}

// NewArticleRepo 创建文章仓储
func NewArticleRepo(db *gorm.DB) ArticleRepo {
	return &articleRepo{db: db}
}

// Create 创建文章
func (r *articleRepo) Create(article *po.Article) error {
	return r.db.Create(article).Error
}

// Update 更新文章
func (r *articleRepo) Update(article *po.Article) error {
	isPinned := article.IsPinned
	pinSort := article.PinSort
	pinnedAt := article.PinnedAt
	if article.Status != 1 {
		isPinned = false
		pinSort = 0
		pinnedAt = nil
	}

	// 使用 Updates 并设置 UpdatedAt，允许更新 CreatedAt
	return r.db.Model(article).Updates(map[string]interface{}{
		"title":            article.Title,
		"content_markdown": article.ContentMarkdown,
		"content_html":     article.ContentHTML,
		"summary":          article.Summary,
		"cover":            article.Cover,
		"category_id":      article.CategoryID,
		"chapter_id":       article.ChapterID,
		"status":           article.Status,
		"is_pinned":        isPinned,
		"pin_sort":         pinSort,
		"pinned_at":        pinnedAt,
		"created_at":       article.CreatedAt, // 明确允许更新创建时间
		"updated_at":       time.Now(),
	}).Error
}

// Delete 删除文章
func (r *articleRepo) Delete(id uint) error {
	return r.db.Select("Tags").Delete(&po.Article{ID: id}).Error
}

// FindByID 根据 ID 查询文章
func (r *articleRepo) FindByID(id uint) (*po.Article, error) {
	var article po.Article
	err := r.db.First(&article, id).Error
	if err != nil {
		return nil, err
	}
	return &article, nil
}

// FindByIDWithRelations 根据 ID 查询文章（包含关联数据）
func (r *articleRepo) FindByIDWithRelations(id uint) (*po.Article, error) {
	var article po.Article
	err := r.db.Preload("Author").Preload("Category").Preload("Tags").First(&article, id).Error
	if err != nil {
		return nil, err
	}
	return &article, nil
}

// FindByIDs 根据多个 ID 查询文章
func (r *articleRepo) FindByIDs(ids []uint) ([]*po.Article, error) {
	var articles []*po.Article
	err := r.db.Preload("Author").Preload("Category").Preload("Tags").
		Where("id IN ?", ids).
		Order("created_at DESC").
		Find(&articles).Error
	if err != nil {
		return nil, err
	}
	return articles, nil
}

// List 查询文章列表
func (r *articleRepo) List(page, limit int, categoryID, tagID, chapterID uint, status, keyword, sort string) ([]*po.Article, int64, error) {
	var articles []*po.Article
	var total int64

	offset := (page - 1) * limit
	query := r.db.Model(&po.Article{}).Preload("Author").Preload("Category").Preload("Tags")

	// 分类过滤
	if categoryID > 0 {
		query = query.Where("category_id = ?", categoryID)
	}

	// 标签过滤
	if tagID > 0 {
		query = query.Joins("JOIN article_tags ON article_tags.article_id = articles.id").
			Where("article_tags.tag_id = ?", tagID)
	}

	// 章节过滤
	if chapterID > 0 {
		query = query.Where("chapter_id = ?", chapterID)
	}

	// 状态过滤
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// 关键词搜索
	if keyword != "" {
		likeKeyword := "%" + keyword + "%"
		query = query.Where(
			"articles.title LIKE ? OR articles.summary LIKE ? OR articles.content_markdown LIKE ? OR articles.content_html LIKE ?",
			likeKeyword,
			likeKeyword,
			likeKeyword,
			likeKeyword,
		)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	pinnedOrderPrefix := "articles.is_pinned DESC, CASE WHEN articles.is_pinned THEN articles.pin_sort ELSE 0 END ASC, CASE WHEN articles.is_pinned THEN articles.pinned_at ELSE NULL END DESC, "

	// 根据排序参数动态排序
	orderBy := "created_at DESC" // 默认按创建时间降序
	switch sort {
	case "views":
		orderBy = "view_count DESC"
	case "likes":
		orderBy = "like_count DESC"
	case "latest":
		orderBy = "created_at DESC"
	}
	if keyword == "" {
		orderBy = pinnedOrderPrefix + orderBy
	}

	if err := query.Offset(offset).Limit(limit).Order(orderBy).Find(&articles).Error; err != nil {
		return nil, 0, err
	}

	return articles, total, nil
}

// UpdateStatus 更新文章状态
func (r *articleRepo) UpdateStatus(id uint, status int) error {
	updates := map[string]interface{}{"status": status}
	if status != 1 {
		updates["is_pinned"] = false
		updates["pin_sort"] = 0
		updates["pinned_at"] = nil
	}
	return r.db.Model(&po.Article{}).Where("id = ?", id).Updates(updates).Error
}

// CountPinned 统计当前置顶文章数量
func (r *articleRepo) CountPinned() (int64, error) {
	var count int64
	err := r.db.Model(&po.Article{}).
		Where("is_pinned = ? AND status = ?", true, 1).
		Count(&count).Error
	return count, err
}

// ListPinned 查询已置顶文章
func (r *articleRepo) ListPinned() ([]*po.Article, error) {
	var articles []*po.Article
	err := r.db.Preload("Author").Preload("Category").Preload("Tags").
		Where("is_pinned = ? AND status = ?", true, 1).
		Order("pin_sort ASC, pinned_at DESC, created_at DESC").
		Find(&articles).Error
	return articles, err
}

// UpdatePinned 更新文章置顶状态
func (r *articleRepo) UpdatePinned(id uint, isPinned bool, pinSort int, pinnedAt *time.Time) error {
	return r.db.Model(&po.Article{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_pinned": isPinned,
		"pin_sort":  pinSort,
		"pinned_at": pinnedAt,
	}).Error
}

// IncrementViewCount 增加浏览量
func (r *articleRepo) IncrementViewCount(id uint) error {
	return r.db.Model(&po.Article{}).Where("id = ?", id).
		UpdateColumn("view_count", gorm.Expr("view_count + ?", 1)).Error
}

// IncrementLikeCount 增加点赞数
func (r *articleRepo) IncrementLikeCount(id uint) error {
	return r.db.Model(&po.Article{}).Where("id = ?", id).
		UpdateColumn("like_count", gorm.Expr("like_count + ?", 1)).Error
}

// DecrementLikeCount 减少点赞数
func (r *articleRepo) DecrementLikeCount(id uint) error {
	return r.db.Model(&po.Article{}).Where("id = ? AND like_count > 0", id).
		UpdateColumn("like_count", gorm.Expr("like_count - ?", 1)).Error
}

// IncrementFavoriteCount 增加收藏数
func (r *articleRepo) IncrementFavoriteCount(id uint) error {
	return r.db.Model(&po.Article{}).Where("id = ?", id).
		UpdateColumn("favorite_count", gorm.Expr("favorite_count + ?", 1)).Error
}

// DecrementFavoriteCount 减少收藏数
func (r *articleRepo) DecrementFavoriteCount(id uint) error {
	return r.db.Model(&po.Article{}).Where("id = ? AND favorite_count > 0", id).
		UpdateColumn("favorite_count", gorm.Expr("favorite_count - ?", 1)).Error
}

// IncrementCommentCount 增加评论数
func (r *articleRepo) IncrementCommentCount(id uint) error {
	return r.db.Model(&po.Article{}).Where("id = ?", id).
		UpdateColumn("comment_count", gorm.Expr("comment_count + ?", 1)).Error
}

// DecrementCommentCount 减少评论数
func (r *articleRepo) DecrementCommentCount(id uint) error {
	return r.db.Model(&po.Article{}).Where("id = ? AND comment_count > 0", id).
		UpdateColumn("comment_count", gorm.Expr("comment_count - ?", 1)).Error
}

// AssociateTags 关联标签
func (r *articleRepo) AssociateTags(articleID uint, tagIDs []uint) error {
	var article po.Article
	if err := r.db.First(&article, articleID).Error; err != nil {
		return err
	}

	var tags []po.Tag
	if err := r.db.Find(&tags, tagIDs).Error; err != nil {
		return err
	}

	return r.db.Model(&article).Association("Tags").Replace(tags)
}

// BatchDelete 批量删除
func (r *articleRepo) BatchDelete(articleIDs []uint) error {
	return r.db.Select("Tags").Delete(&po.Article{}, articleIDs).Error
}

// GetRelatedArticles 获取相关文章
func (r *articleRepo) GetRelatedArticles(id uint, limit int) ([]*po.Article, error) {
	var current po.Article
	if err := r.db.Preload("Tags").Where("id = ? AND status = ?", id, 1).First(&current).Error; err != nil {
		return nil, err
	}

	tagIDs := make([]uint, 0, len(current.Tags))
	for _, tag := range current.Tags {
		tagIDs = append(tagIDs, tag.ID)
	}

	query := r.db.Model(&po.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags").
		Where("id <> ? AND status = ?", id, 1)

	if limit <= 0 {
		limit = 6
	}

	candidateLimit := limit * 6
	if candidateLimit < 24 {
		candidateLimit = 24
	}

	var articles []*po.Article
	if len(tagIDs) > 0 {
		query = query.Where(
			"category_id = ? OR id IN (?)",
			current.CategoryID,
			r.db.Table("article_tags").Select("article_id").Where("tag_id IN ?", tagIDs),
		)
	} else {
		query = query.Where("category_id = ?", current.CategoryID)
	}

	err := query.
		Order("view_count DESC").
		Order("created_at DESC").
		Limit(candidateLimit).
		Find(&articles).Error
	if err != nil {
		return nil, err
	}

	currentTagSet := make(map[uint]struct{}, len(tagIDs))
	for _, tagID := range tagIDs {
		currentTagSet[tagID] = struct{}{}
	}

	score := func(article *po.Article) int {
		total := 0
		if article.CategoryID == current.CategoryID {
			total += 2
		}
		for _, tag := range article.Tags {
			if _, ok := currentTagSet[tag.ID]; ok {
				total += 3
			}
		}
		return total
	}

	sort.SliceStable(articles, func(i, j int) bool {
		leftScore := score(articles[i])
		rightScore := score(articles[j])
		if leftScore != rightScore {
			return leftScore > rightScore
		}
		if articles[i].ViewCount != articles[j].ViewCount {
			return articles[i].ViewCount > articles[j].ViewCount
		}
		return articles[i].CreatedAt.After(articles[j].CreatedAt)
	})

	if len(articles) > limit {
		articles = articles[:limit]
	}

	return articles, nil
}

// ListPublished 获取已发布文章列表
func (r *articleRepo) ListPublished(limit int) ([]*po.Article, error) {
	query := r.db.Preload("Author").
		Preload("Category").
		Preload("Tags").
		Where("status = ?", 1).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	var articles []*po.Article
	if err := query.Find(&articles).Error; err != nil {
		return nil, err
	}

	return articles, nil
}
