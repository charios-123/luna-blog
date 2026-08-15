package biz

import (
	"errors"

	"github.com/charios-123/luna-blog/internal/data"
	"github.com/charios-123/luna-blog/internal/model/po"
	"gorm.io/gorm"
)

// CategoryUseCase 分类业务用例接口
type CategoryUseCase interface {
	// Create 创建分类
	Create(name, description string, sort int) error
	// Delete 删除分类
	Delete(id uint) error
	// List 查询分类列表
	List() ([]po.Category, error)
}

// categoryUseCase 分类业务用例实现
type categoryUseCase struct {
	data *data.Data
}

// NewCategoryUseCase 创建分类业务用例
func NewCategoryUseCase(d *data.Data) CategoryUseCase {
	return &categoryUseCase{data: d}
}

// Create 创建分类
func (uc *categoryUseCase) Create(name, description string, sort int) error {
	// 检查分类名称是否已存在
	if _, err := uc.data.CategoryRepo.FindByName(name); err == nil {
		return errors.New("分类名称已存在")
	}

	category := &po.Category{
		Name:        name,
		Description: description,
		Sort:        sort,
	}

	if err := uc.data.CategoryRepo.Create(category); err != nil {
		return errors.New("创建分类失败")
	}

	return nil
}

// Delete 删除分类
func (uc *categoryUseCase) Delete(id uint) error {
	// 检查分类是否存在
	if _, err := uc.data.CategoryRepo.FindByID(id); err != nil {
		return errors.New("分类不存在")
	}

	// 检查分类下是否有文章
	hasArticles, err := uc.data.CategoryRepo.HasArticles(id)
	if err != nil {
		return errors.New("查询失败")
	}
	if hasArticles {
		return errors.New("该分类下存在文章，无法删除")
	}

	if err := uc.data.CategoryRepo.Delete(id); err != nil {
		return errors.New("删除分类失败")
	}

	return nil
}

// List 查询分类列表(含文章数量)
func (uc *categoryUseCase) List() ([]po.Category, error) {
	categories, err := uc.data.CategoryRepo.List()
	if err != nil {
		return nil, errors.New("查询分类列表失败")
	}

	// 批量查询每个分类的文章数量
	if len(categories) > 0 {
		catIDs := make([]uint, 0, len(categories))
		for _, c := range categories {
			catIDs = append(catIDs, c.ID)
		}

		type countRow struct {
			CategoryID uint
			Total      int64
		}
		var rows []countRow
		if err := uc.data.GetDB().Model(&po.Article{}).
			Select("category_id, COUNT(*) as total").
			Where("category_id IN ? AND status = ?", catIDs, 1).
			Group("category_id").
			Scan(&rows).Error; err == nil {
			countMap := make(map[uint]int64, len(rows))
			for _, r := range rows {
				countMap[r.CategoryID] = r.Total
			}
			for _, c := range categories {
				c.ArticleCount = countMap[c.ID]
			}
		}
	}

	result := make([]po.Category, 0, len(categories))
	for _, category := range categories {
		result = append(result, *category)
	}

	return result, nil
}

// TagUseCase 标签业务用例接口
type TagUseCase interface {
	// Create 创建标签
	Create(name, color string) error
	// Delete 删除标签
	Delete(id uint) error
	// List 查询标签列表
	List() ([]po.Tag, error)
}

// tagUseCase 标签业务用例实现
type tagUseCase struct {
	data *data.Data
}

// NewTagUseCase 创建标签业务用例
func NewTagUseCase(d *data.Data) TagUseCase {
	return &tagUseCase{data: d}
}

// Create 创建标签
func (uc *tagUseCase) Create(name, color string) error {
	// 检查标签名称是否已存在
	if _, err := uc.data.TagRepo.FindByName(name); err == nil {
		return errors.New("标签名称已存在")
	}

	tag := &po.Tag{
		Name:  name,
		Color: color,
	}

	if err := uc.data.TagRepo.Create(tag); err != nil {
		return errors.New("创建标签失败")
	}

	return nil
}

// Delete 删除标签
func (uc *tagUseCase) Delete(id uint) error {
	// 检查标签是否存在
	if _, err := uc.data.TagRepo.FindByID(id); err != nil {
		return errors.New("标签不存在")
	}

	if err := uc.data.TagRepo.Delete(id); err != nil {
		return errors.New("删除标签失败")
	}

	return nil
}

// List 查询标签列表
func (uc *tagUseCase) List() ([]po.Tag, error) {
	tags, err := uc.data.TagRepo.List()
	if err != nil {
		return nil, errors.New("查询标签列表失败")
	}

	result := make([]po.Tag, 0, len(tags))
	for _, tag := range tags {
		result = append(result, *tag)
	}

	return result, nil
}

// CommentUseCase 评论业务用例接口
type CommentUseCase interface {
	// Delete 删除评论
	Delete(id uint) error
	// UpdateStatus 更新评论状态
	UpdateStatus(id uint, status int) error
	// List 查询评论列表
	List(page, limit int, articleID uint, status string) ([]*po.Comment, int64, error)
}

// commentUseCase 评论业务用例实现
type commentUseCase struct {
	data *data.Data
}

// NewCommentUseCase 创建评论业务用例
func NewCommentUseCase(d *data.Data) CommentUseCase {
	return &commentUseCase{data: d}
}

// Delete 删除评论
func (uc *commentUseCase) Delete(id uint) error {
	// 检查评论是否存在
	comment, err := uc.data.CommentRepo.FindByID(id)
	if err != nil {
		return errors.New("评论不存在")
	}

	// 删除评论：只删除本条评论。若删除的是父评论，将其子回复提升一级，
	// 避免把别人的回复也一起"删掉"（变为不可见）
	if err := uc.data.GetDB().Transaction(func(tx *gorm.DB) error {
		if comment.ParentID != nil {
			// 子评论：其子回复挂到父评论下
			if err := tx.Model(&po.Comment{}).Where("parent_id = ?", id).
				Update("parent_id", *comment.ParentID).Error; err != nil {
				return err
			}
		} else {
			// 顶级评论：其子回复提升为顶级评论
			if err := tx.Model(&po.Comment{}).Where("parent_id = ?", id).
				Update("parent_id", gorm.Expr("NULL")).Error; err != nil {
				return err
			}
		}
		return tx.Delete(&po.Comment{}, id).Error
	}); err != nil {
		return errors.New("删除评论失败")
	}

	return nil
}

// UpdateStatus 更新评论状态
func (uc *commentUseCase) UpdateStatus(id uint, status int) error {
	// 检查评论是否存在
	if _, err := uc.data.CommentRepo.FindByID(id); err != nil {
		return errors.New("评论不存在")
	}

	if err := uc.data.CommentRepo.UpdateStatus(id, status); err != nil {
		return errors.New("更新状态失败")
	}

	return nil
}

// List 查询评论列表
func (uc *commentUseCase) List(page, limit int, articleID uint, status string) ([]*po.Comment, int64, error) {
	comments, total, err := uc.data.CommentRepo.List(page, limit, articleID, status)
	if err != nil {
		return nil, 0, errors.New("查询评论列表失败")
	}

	return comments, total, nil
}
