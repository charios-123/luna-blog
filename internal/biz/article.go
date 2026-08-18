package biz

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/charios-123/luna-blog/internal/data"
	"github.com/charios-123/luna-blog/internal/model/dto"
	"github.com/charios-123/luna-blog/internal/model/po"
	"github.com/charios-123/luna-blog/pkg/logger"
	mdutils "github.com/charios-123/luna-blog/pkg/markdown"
	"github.com/gomarkdown/markdown"
	"github.com/gomarkdown/markdown/html"
	"github.com/gomarkdown/markdown/parser"
)

// ArticleUseCase 文章业务用例接口
type ArticleUseCase interface {
	// Create 创建文章
	Create(req *dto.CreateArticleRequest, authorID uint) (*dto.ArticleResponse, error)
	// Update 更新文章
	Update(id uint, req *dto.UpdateArticleRequest) (*dto.ArticleResponse, error)
	// Delete 删除文章
	Delete(id uint) error
	// GetByID 根据 ID 查询文章
	GetByID(id uint) (*dto.ArticleResponse, error)
	// List 查询文章列表
	List(req *dto.ArticleListRequest) (*dto.PageResponse, error)
	// UpdateStatus 更新文章状态
	UpdateStatus(id uint, status int) error
	// UpdatePin 更新文章置顶状态
	UpdatePin(id uint, isPinned bool) error
	// Search 搜索文章
	Search(keyword string, page, limit int, sort string, categoryID, tagID uint) (*dto.PageResponse, error)
	// Archive 获取归档文章（按月份分组）
	Archive(page, limit int) (*dto.PageResponse, error)
	// GetDefaultCategoryID 获取默认分类ID
	GetDefaultCategoryID() (uint, error)
	// BatchDelete 批量删除
	BatchDelete(articleIDs []uint) error
	// ListPublished 获取已发布文章
	ListPublished(limit int) ([]dto.ArticleListItem, error)
	// CrawlAndSave 抓取指定关键词的 CSDN 文章并入库(去重)
	// keyword: 搜索关键词(如 golang, kubernetes)
	// categoryID: 入库后归属分类 ID
	// 返回新增入库的文章数量
	CrawlAndSave(keyword string, categoryID uint) (int, error)
}

// articleUseCase 文章业务用例实现
type articleUseCase struct {
	data *data.Data
}

const maxPinnedArticles = 5

// NewArticleUseCase 创建文章业务用例
func NewArticleUseCase(d *data.Data) ArticleUseCase {
	return &articleUseCase{data: d}
}

// Create 创建文章
func (uc *articleUseCase) Create(req *dto.CreateArticleRequest, authorID uint) (*dto.ArticleResponse, error) {
	// 验证分类是否存在
	if _, err := uc.data.CategoryRepo.FindByID(req.CategoryID); err != nil {
		return nil, errors.New("分类不存在")
	}

	// 处理 Markdown 中的图片（下载外部图片并替换为本地链接）
	processor := mdutils.NewImageProcessor("uploads", "")
	processedMarkdown, err := processor.ProcessMarkdownImages(req.ContentMarkdown)
	if err != nil {
		// 图片处理失败不阻断文章创建，使用原始内容
		processedMarkdown = req.ContentMarkdown
	}

	// 清理 Markdown 内容中的多余符号
	processedMarkdown = mdutils.CleanMarkdownContent(processedMarkdown)

	// 如果没有提供 HTML，则自动从 Markdown 转换
	contentHTML := req.ContentHTML
	if contentHTML == "" {
		contentHTML = markdownToHTML(processedMarkdown)
	}

	// 创建文章
	article := &po.Article{
		Title:           req.Title,
		ContentMarkdown: processedMarkdown, // 使用处理后的 Markdown
		ContentHTML:     contentHTML,
		Summary:         req.Summary,
		Cover:           req.Cover,
		AuthorID:        authorID,
		CategoryID:      req.CategoryID,
		ChapterID:       req.ChapterID,
		Status:          req.Status,
	}

	// 如果指定了创建时间，则设置
	if req.CreatedAt != nil {
		article.CreatedAt = *req.CreatedAt
	}

	if err := uc.data.ArticleRepo.Create(article); err != nil {
		return nil, errors.New("创建文章失败: " + err.Error())
	}

	// 关联标签
	if len(req.TagIDs) > 0 {
		if err := uc.data.ArticleRepo.AssociateTags(article.ID, req.TagIDs); err != nil {
			return nil, errors.New("关联标签失败: " + err.Error())
		}
	}

	// 重新查询文章（包含关联数据）
	return uc.GetByID(article.ID)
}

// Update 更新文章
func (uc *articleUseCase) Update(id uint, req *dto.UpdateArticleRequest) (*dto.ArticleResponse, error) {
	// 查询文章
	article, err := uc.data.ArticleRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("文章不存在")
	}

	// 更新字段
	if req.Title != "" {
		article.Title = req.Title
	}
	if req.ContentMarkdown != "" {
		// 处理 Markdown 中的图片（下载外部图片并替换为本地链接）
		processor := mdutils.NewImageProcessor("uploads", "")
		processedMarkdown, err := processor.ProcessMarkdownImages(req.ContentMarkdown)
		if err != nil {
			// 图片处理失败不阻断文章更新，使用原始内容
			processedMarkdown = req.ContentMarkdown
		}

		// 清理 Markdown 内容中的多余符号
		processedMarkdown = mdutils.CleanMarkdownContent(processedMarkdown)

		article.ContentMarkdown = processedMarkdown
		// 如果提供了 Markdown，自动转换为 HTML（除非明确提供了 HTML）
		if req.ContentHTML != "" {
			article.ContentHTML = req.ContentHTML
		} else {
			article.ContentHTML = markdownToHTML(processedMarkdown)
		}
	}
	if req.Summary != "" {
		article.Summary = req.Summary
	}
	if req.Cover != "" {
		article.Cover = req.Cover
	}
	if req.CategoryID > 0 {
		// 验证分类是否存在
		if _, err := uc.data.CategoryRepo.FindByID(req.CategoryID); err != nil {
			return nil, errors.New("分类不存在")
		}
		article.CategoryID = req.CategoryID
	}
	// 设置章节ID（可为空）
	article.ChapterID = req.ChapterID
	if req.Status != nil {
		article.Status = *req.Status
	}

	// 如果指定了创建时间，则更新
	if req.CreatedAt != nil {
		article.CreatedAt = *req.CreatedAt
	}

	if err := uc.data.ArticleRepo.Update(article); err != nil {
		return nil, errors.New("更新文章失败")
	}

	// 更新标签关联
	if len(req.TagIDs) > 0 {
		if err := uc.data.ArticleRepo.AssociateTags(article.ID, req.TagIDs); err != nil {
			return nil, errors.New("更新标签失败")
		}
	}

	// 重新查询文章
	return uc.GetByID(id)
}

// Delete 删除文章
func (uc *articleUseCase) Delete(id uint) error {
	// 检查文章是否存在
	if _, err := uc.data.ArticleRepo.FindByID(id); err != nil {
		return errors.New("文章不存在")
	}

	if err := uc.data.ArticleRepo.Delete(id); err != nil {
		return errors.New("删除文章失败")
	}

	return nil
}

// GetByID 根据 ID 查询文章
func (uc *articleUseCase) GetByID(id uint) (*dto.ArticleResponse, error) {
	article, err := uc.data.ArticleRepo.FindByIDWithRelations(id)
	if err != nil {
		return nil, errors.New("文章不存在")
	}

	return uc.convertToArticleResponse(article), nil
}

// List 查询文章列表
func (uc *articleUseCase) List(req *dto.ArticleListRequest) (*dto.PageResponse, error) {
	// 解析查询参数
	var categoryID, tagID, chapterID uint
	// 优先使用 category_id(数字),其次用 category(名称) 查找
	if req.CategoryID != "" {
		if id, err := strconv.ParseUint(req.CategoryID, 10, 32); err == nil {
			categoryID = uint(id)
		}
	} else if req.Category != "" {
		category, err := uc.data.CategoryRepo.FindByName(req.Category)
		if err == nil {
			categoryID = category.ID
		}
	}
	// 优先使用 tag_id(数字),其次用 tag(名称) 查找
	if req.TagID != "" {
		if id, err := strconv.ParseUint(req.TagID, 10, 32); err == nil {
			tagID = uint(id)
		}
	} else if req.Tag != "" {
		tag, err := uc.data.TagRepo.FindByName(req.Tag)
		if err == nil {
			tagID = tag.ID
		}
	}
	// 解析章节ID
	if req.ChapterID != "" {
		if id, err := strconv.ParseUint(req.ChapterID, 10, 32); err == nil {
			chapterID = uint(id)
		}
	}

	// 查询文章列表
	articles, total, err := uc.data.ArticleRepo.List(
		req.Page, req.Limit,
		categoryID, tagID, chapterID,
		req.Status, req.Keyword, req.Sort,
	)
	if err != nil {
		return nil, errors.New("查询文章列表失败")
	}

	// 转换为 DTO
	items := make([]dto.ArticleListItem, 0, len(articles))
	for _, article := range articles {
		items = append(items, uc.convertToArticleListItem(article))
	}

	return &dto.PageResponse{
		Total: total,
		Page:  req.Page,
		Limit: req.Limit,
		Data:  items,
	}, nil
}

// UpdateStatus 更新文章状态
func (uc *articleUseCase) UpdateStatus(id uint, status int) error {
	// 检查文章是否存在
	if _, err := uc.data.ArticleRepo.FindByID(id); err != nil {
		return errors.New("文章不存在")
	}

	if err := uc.data.ArticleRepo.UpdateStatus(id, status); err != nil {
		return errors.New("更新状态失败")
	}

	return nil
}

// UpdatePin 更新文章置顶状态
func (uc *articleUseCase) UpdatePin(id uint, isPinned bool) error {
	article, err := uc.data.ArticleRepo.FindByID(id)
	if err != nil {
		return errors.New("文章不存在")
	}

	if isPinned {
		if article.Status != 1 {
			return errors.New("只有已发布文章可以置顶")
		}
		pinSort := article.PinSort
		if !article.IsPinned {
			pinnedArticles, err := uc.data.ArticleRepo.ListPinned()
			if err != nil {
				return errors.New("查询置顶文章失败")
			}
			if len(pinnedArticles) >= maxPinnedArticles {
				return errors.New("最多只能置顶5篇文章，请先取消其他置顶文章")
			}
			pinSort = nextPinSort(pinnedArticles)
		}
		pinnedAt := time.Now()
		if pinSort <= 0 {
			pinSort = int(article.ID)
		}
		return uc.data.ArticleRepo.UpdatePinned(id, true, pinSort, &pinnedAt)
	}

	return uc.data.ArticleRepo.UpdatePinned(id, false, 0, nil)
}

func nextPinSort(articles []*po.Article) int {
	maxSort := 0
	for _, article := range articles {
		if article.PinSort > maxSort {
			maxSort = article.PinSort
		}
	}
	return maxSort + 1
}

// convertToArticleResponse 转换为文章响应
func (uc *articleUseCase) convertToArticleResponse(article *po.Article) *dto.ArticleResponse {
	resp := &dto.ArticleResponse{
		ID:              article.ID,
		Title:           article.Title,
		ContentMarkdown: article.ContentMarkdown,
		ContentHTML:     article.ContentHTML,
		Summary:         article.Summary,
		Cover:           article.Cover,
		AuthorID:        article.AuthorID,
		CategoryID:      article.CategoryID,
		ChapterID:       article.ChapterID,
		Status:          article.Status,
		IsPinned:        article.IsPinned,
		PinSort:         article.PinSort,
		PinnedAt:        article.PinnedAt,
		ViewCount:       article.ViewCount,
		LikeCount:       article.LikeCount,
		FavoriteCount:   article.FavoriteCount,
		CommentCount:    article.CommentCount,
		CreatedAt:       article.CreatedAt,
		UpdatedAt:       article.UpdatedAt,
	}

	// 作者信息
	if article.Author.ID > 0 {
		resp.Author = &dto.AuthorInfo{
			ID:       article.Author.ID,
			Username: article.Author.Username,
			Nickname: article.Author.Nickname,
			Avatar:   article.Author.Avatar,
		}
	}

	// 分类信息
	if article.Category.ID > 0 {
		resp.Category = &dto.CategoryInfo{
			ID:          article.Category.ID,
			Name:        article.Category.Name,
			Description: article.Category.Description,
		}
	}

	// 标签信息
	if len(article.Tags) > 0 {
		tags := make([]dto.TagInfo, 0, len(article.Tags))
		for _, tag := range article.Tags {
			tags = append(tags, dto.TagInfo{
				ID:    tag.ID,
				Name:  tag.Name,
				Color: tag.Color,
			})
		}
		resp.Tags = tags
	}

	return resp
}

// convertToArticleListItem 转换为文章列表项
func (uc *articleUseCase) convertToArticleListItem(article *po.Article) dto.ArticleListItem {
	item := dto.ArticleListItem{
		ID:            article.ID,
		Title:         article.Title,
		Summary:       article.Summary,
		Cover:         article.Cover,
		Status:        article.Status,
		IsPinned:      article.IsPinned,
		PinSort:       article.PinSort,
		PinnedAt:      article.PinnedAt,
		ViewCount:     article.ViewCount,
		LikeCount:     article.LikeCount,
		FavoriteCount: article.FavoriteCount,
		CommentCount:  article.CommentCount,
		CreatedAt:     article.CreatedAt,
	}

	// 作者信息
	if article.Author.ID > 0 {
		item.Author = &dto.AuthorInfo{
			ID:       article.Author.ID,
			Username: article.Author.Username,
			Nickname: article.Author.Nickname,
			Avatar:   article.Author.Avatar,
		}
	}

	// 分类信息
	if article.Category.ID > 0 {
		item.Category = &dto.CategoryInfo{
			ID:          article.Category.ID,
			Name:        article.Category.Name,
			Description: article.Category.Description,
		}
	}

	// 标签信息
	if len(article.Tags) > 0 {
		tags := make([]dto.TagInfo, 0, len(article.Tags))
		for _, tag := range article.Tags {
			tags = append(tags, dto.TagInfo{
				ID:    tag.ID,
				Name:  tag.Name,
				Color: tag.Color,
			})
		}
		item.Tags = tags
	}

	return item
}

// markdownToHTML 将 Markdown 转换为 HTML
func markdownToHTML(md string) string {
	// 创建 Markdown 解析器
	extensions := parser.CommonExtensions | parser.AutoHeadingIDs | parser.NoEmptyLineBeforeBlock
	p := parser.NewWithExtensions(extensions)
	doc := p.Parse([]byte(md))

	// 创建 HTML 渲染器
	htmlFlags := html.CommonFlags | html.HrefTargetBlank
	opts := html.RendererOptions{Flags: htmlFlags}
	renderer := html.NewRenderer(opts)

	// 渲染为 HTML
	return string(markdown.Render(doc, renderer))
}

// Search 搜索文章
func (uc *articleUseCase) Search(keyword string, page, limit int, sort string, categoryID, tagID uint) (*dto.PageResponse, error) {
	keyword = strings.TrimSpace(keyword)
	if keyword == "" {
		req := &dto.ArticleListRequest{
			PageRequest: dto.PageRequest{
				Page:  page,
				Limit: limit,
			},
			Status: "1",
			Sort:   sort,
		}
		if categoryID > 0 {
			req.CategoryID = strconv.FormatUint(uint64(categoryID), 10)
		}
		if tagID > 0 {
			req.TagID = strconv.FormatUint(uint64(tagID), 10)
		}
		return uc.List(req)
	}

	articles, total, err := uc.data.ArticleRepo.List(page, limit, categoryID, tagID, 0, "1", keyword, sort)
	if err != nil {
		return nil, errors.New("搜索文章失败")
	}

	items := make([]dto.ArticleListItem, 0, len(articles))
	for _, article := range articles {
		item := uc.convertToArticleListItem(article)
		uc.applySearchMetadata(&item, article, keyword)
		items = append(items, item)
	}

	return &dto.PageResponse{
		Total: total,
		Page:  page,
		Limit: limit,
		Data:  items,
	}, nil
}

func (uc *articleUseCase) applySearchMetadata(item *dto.ArticleListItem, article *po.Article, keyword string) {
	fields := []struct {
		label string
		text  string
	}{
		{label: "标题", text: article.Title},
		{label: "摘要", text: article.Summary},
		{label: "正文", text: article.ContentMarkdown},
		{label: "正文", text: article.ContentHTML},
	}

	for _, field := range fields {
		plainText := cleanSearchText(field.text)
		if containsIgnoreCase(plainText, keyword) {
			item.MatchedField = field.label
			item.SearchSnippet = buildSearchSnippet(plainText, keyword, 54)
			return
		}
	}
}

var (
	htmlTagPattern       = regexp.MustCompile(`<[^>]+>`)
	markdownImagePattern = regexp.MustCompile(`!\[[^\]]*\]\([^)]+\)`)
	markdownLinkPattern  = regexp.MustCompile(`\[[^\]]+\]\([^)]+\)`)
	markdownSyntaxChars  = regexp.MustCompile("[#>*_`~\\[\\]()]")
	spacePattern         = regexp.MustCompile(`\s+`)
)

func cleanSearchText(value string) string {
	text := htmlTagPattern.ReplaceAllString(value, " ")
	text = markdownImagePattern.ReplaceAllString(text, " ")
	text = markdownLinkPattern.ReplaceAllString(text, " ")
	text = markdownSyntaxChars.ReplaceAllString(text, " ")
	text = strings.ReplaceAll(text, "&nbsp;", " ")
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	text = strings.ReplaceAll(text, "&amp;", "&")
	return strings.TrimSpace(spacePattern.ReplaceAllString(text, " "))
}

func containsIgnoreCase(text, keyword string) bool {
	return strings.Contains(strings.ToLower(text), strings.ToLower(keyword))
}

func buildSearchSnippet(text, keyword string, radius int) string {
	if text == "" {
		return ""
	}

	lowerText := strings.ToLower(text)
	lowerKeyword := strings.ToLower(keyword)
	byteIndex := strings.Index(lowerText, lowerKeyword)
	if byteIndex < 0 {
		return truncateRunes(text, radius*2)
	}

	runes := []rune(text)
	startRune := utf8.RuneCountInString(text[:byteIndex])
	keywordLen := utf8.RuneCountInString(keyword)

	start := startRune - radius
	if start < 0 {
		start = 0
	}

	end := startRune + keywordLen + radius
	if end > len(runes) {
		end = len(runes)
	}

	snippet := string(runes[start:end])
	if start > 0 {
		snippet = "..." + snippet
	}
	if end < len(runes) {
		snippet += "..."
	}
	return snippet
}

func truncateRunes(text string, limit int) string {
	runes := []rune(text)
	if len(runes) <= limit {
		return text
	}
	return string(runes[:limit]) + "..."
}

// Archive 获取归档文章（返回所有已发布的文章，前端按月份分组）
func (uc *articleUseCase) Archive(page, limit int) (*dto.PageResponse, error) {
	req := &dto.ArticleListRequest{
		PageRequest: dto.PageRequest{
			Page:  page,
			Limit: limit,
		},
		Status: "1", // 只返回已发布的文章
	}
	return uc.List(req)
}

// GetDefaultCategoryID 获取默认分类ID
func (uc *articleUseCase) GetDefaultCategoryID() (uint, error) {
	categories, err := uc.data.CategoryRepo.List()
	if err != nil {
		return 0, errors.New("查询分类列表失败")
	}
	if len(categories) == 0 {
		return 0, errors.New("系统中没有可用的分类")
	}
	return categories[0].ID, nil
}

// BatchDelete 批量删除
func (uc *articleUseCase) BatchDelete(articleIDs []uint) error {
	if len(articleIDs) == 0 {
		return errors.New("文章ID列表不能为空")
	}

	if err := uc.data.ArticleRepo.BatchDelete(articleIDs); err != nil {
		return errors.New("批量删除失败: " + err.Error())
	}

	return nil
}

// ListPublished 获取已发布文章
func (uc *articleUseCase) ListPublished(limit int) ([]dto.ArticleListItem, error) {
	articles, err := uc.data.ArticleRepo.ListPublished(limit)
	if err != nil {
		return nil, errors.New("获取已发布文章失败: " + err.Error())
	}

	items := make([]dto.ArticleListItem, 0, len(articles))
	for _, article := range articles {
		items = append(items, uc.convertToArticleListItem(article))
	}

	return items, nil
}

// CrawlAndSave 抓取 CSDN 文章并入库(去重)
// 1. 调用 CSDNCrawler 拉取关键词搜索结果
// 2. 用 SourceURL 唯一索引判断是否已存在,已存在则跳过
// 3. 新文章以 Source="csdn-{keyword}" 标识,状态默认为已发布(1)直接展示
func (uc *articleUseCase) CrawlAndSave(keyword string, categoryID uint) (int, error) {
	keyword = strings.TrimSpace(keyword)
	if keyword == "" {
		return 0, errors.New("keyword 不能为空")
	}
	if categoryID == 0 {
		return 0, errors.New("categoryID 不能为空")
	}

	// 校验分类存在
	if _, err := uc.data.CategoryRepo.FindByID(categoryID); err != nil {
		return 0, errors.New("分类不存在: " + err.Error())
	}

	// 解析作者 ID
	authorID, err := uc.resolveCrawlAuthorID()
	if err != nil {
		return 0, errors.New("无法解析作者 ID: " + err.Error())
	}

	crawler := NewCSDNCrawler()
	articles, err := crawler.FetchArticles(keyword)
	if err != nil {
		return 0, errors.New("CSDN 抓取失败: " + err.Error())
	}

	sourceTag := "csdn-" + keyword
	saved := 0
	for _, item := range articles {
		// 去重
		var existing int64
		if err := uc.data.GetDB().Model(&po.Article{}).
			Where("source_url = ?", item.URL).
			Count(&existing).Error; err != nil {
			logger.Warn("查询 source_url 去重失败: ", err)
			continue
		}
		if existing > 0 {
			continue
		}

		// 抓取全文
		fullMD := ""
		if md, err := crawler.FetchArticlePage(item.URL); err == nil {
			fullMD = md
		} else {
			logger.Warn(fmt.Sprintf("全文抓取失败 url=%q: %v, 跳过该文章", item.URL, err))
			continue
		}

		// 构造摘要:优先用全文前 200 字,其次 Description,最后 Body
		summary := item.Description
		if summary == "" && fullMD != "" {
			summary = truncateRunes(stripMarkdown(fullMD), 200)
		}
		if summary == "" {
			summary = truncateRunes(item.Body, 200)
		}

		// 使用全文 Markdown
		contentMarkdown := fullMD

		// 检测内容是否乱码(字符缺失等问题)
		if isCorruptedContent(contentMarkdown) {
			logger.Warn(fmt.Sprintf("文章内容疑似乱码 url=%q, 跳过", item.URL))
			continue
		}

		article := &po.Article{
			Title:           item.Title,
			ContentMarkdown: contentMarkdown,
			ContentHTML:     markdownToHTML(contentMarkdown),
			Summary:         summary,
			AuthorID:        authorID,
			CategoryID:      categoryID,
			Status:          1,
			Source:          sourceTag,
			SourceURL:       &item.URL,
			OriginalAuthor:  item.Author,
			CreatedAt:       item.PublishedAt,
		}

		if err := uc.data.ArticleRepo.Create(article); err != nil {
			if isDuplicateKeyErr(err) {
				continue
			}
			logger.Warn(fmt.Sprintf("CSDN 文章入库失败 title=%q: %v", item.Title, err))
			continue
		}
		saved++

		// 礼貌等待,避免请求过快
		time.Sleep(1500 * time.Millisecond)
	}

	logger.Info(fmt.Sprintf("CSDN 入库完成: keyword=%q, source=%s, 新增=%d, 抓取=%d", keyword, sourceTag, saved, len(articles)))
	return saved, nil
}

// buildCrawledArticleMarkdown 构造爬取文章的 Markdown 内容
// 仅保留摘要和正文,不标注来源信息
func buildCrawledArticleMarkdown(item CSDNArticle) string {
	var sb strings.Builder
	if item.Description != "" {
		sb.WriteString(item.Description)
		sb.WriteString("\n\n")
	}
	if item.Body != "" {
		sb.WriteString(item.Body)
		sb.WriteString("\n")
	}
	return sb.String()
}

// stripMarkdown 移除 Markdown 格式,提取纯文本
func stripMarkdown(md string) string {
	// 移除代码块
	re := regexp.MustCompile("```[\\s\\S]*?```")
	md = re.ReplaceAllString(md, "")
	// 移除行内代码
	re = regexp.MustCompile("`[^`]+`")
	md = re.ReplaceAllString(md, "")
	// 移除图片
	re = regexp.MustCompile(`!\[[^\]]*\]\([^)]*\)`)
	md = re.ReplaceAllString(md, "")
	// 移除链接(保留文字)
	re = regexp.MustCompile(`\[([^\]]*)\]\([^)]*\)`)
	md = re.ReplaceAllString(md, "$1")
	// 移除 Markdown 标记
	md = regexp.MustCompile(`[#*_>~\-]`).ReplaceAllString(md, " ")
	// 压缩空白
	md = regexp.MustCompile(`\s+`).ReplaceAllString(md, " ")
	return strings.TrimSpace(md)
}

// isCorruptedContent 检测文章内容是否疑似乱码
// 通过分析文本中的字符模式,检测是否存在系统性字符缺失
func isCorruptedContent(content string) bool {
	if content == "" {
		return true
	}

	// 提取纯文本进行分析
	text := stripMarkdown(content)

	// 如果内容过短,可能是抓取失败
	if len([]rune(text)) < 50 {
		return true
	}

	// 检测是否存在大量短单词(可能是字符缺失导致)
	words := strings.Fields(text)
	if len(words) == 0 {
		return true
	}

	// 统计短单词比例(长度<=3的英文单词)
	shortWordCount := 0
	for _, w := range words {
		if len(w) <= 3 && isASCIIWord(w) {
			shortWordCount++
		}
	}

	// 如果短单词比例过高,可能是字符缺失
	shortRatio := float64(shortWordCount) / float64(len(words))
	if shortRatio > 0.3 {
		return true
	}

	return false
}

// isASCIIWord 判断是否为纯英文单词
func isASCIIWord(s string) bool {
	for _, r := range s {
		if r < 'a' || r > 'z' {
			return false
		}
	}
	return len(s) > 0
}

// isDuplicateKeyErr 判断是否为唯一约束冲突错误
func isDuplicateKeyErr(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "Duplicate entry") || strings.Contains(msg, "unique") || strings.Contains(msg, "UNIQUE")
}

// resolveCrawlAuthorID 解析爬取文章归属的作者 ID
// 优先选取 is_blogger=1 的博主(Luna),其次选 admin/super_admin,最后回退到 id 最小的用户
func (uc *articleUseCase) resolveCrawlAuthorID() (uint, error) {
	// 1) 优先查询博主(is_blogger=1)
	var blogger po.User
	if err := uc.data.GetDB().Where("is_blogger = ?", 1).
		Order("id ASC").First(&blogger).Error; err == nil {
		return blogger.ID, nil
	}
	// 2) 回退:查询 admin/super_admin 角色
	var admin po.User
	if err := uc.data.GetDB().Where("role IN ?", []string{"admin", "super_admin"}).
		Order("id ASC").First(&admin).Error; err == nil {
		return admin.ID, nil
	}
	// 3) 最后回退:id 最小的用户
	var user po.User
	if err := uc.data.GetDB().Order("id ASC").First(&user).Error; err != nil {
		return 0, errors.New("系统中没有任何用户,无法入库爬取文章")
	}
	return user.ID, nil
}
