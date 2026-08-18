package service

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/charios-123/luna-blog/internal/biz"
	"github.com/charios-123/luna-blog/internal/model/dto"
	"github.com/charios-123/luna-blog/pkg/response"
	"github.com/gin-gonic/gin"
)

// ArticleService 文章服务
type ArticleService struct {
	articleUseCase biz.ArticleUseCase
}

// NewArticleService 创建文章服务
func NewArticleService(articleUseCase biz.ArticleUseCase) *ArticleService {
	return &ArticleService{
		articleUseCase: articleUseCase,
	}
}

// Create 创建文章
// @Summary 创建文章
// @Description 创建一篇新文章
// @Tags 文章管理
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.CreateArticleRequest true "文章信息"
// @Success 200 {object} response.Response "创建成功"
// @Failure 400 {object} response.Response "请求参数错误"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /articles [post]
func (s *ArticleService) Create(c *gin.Context) {
	var req dto.CreateArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 分类必选,给出中文提示
	if req.CategoryID == 0 {
		response.BadRequest(c, "请选择分类")
		return
	}

	// 获取作者 ID
	adminID, _ := c.Get("admin_id")

	resp, err := s.articleUseCase.Create(&req, adminID.(uint))
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, resp)
}

// Update 更新文章
// @Summary 更新文章
// @Description 更新文章信息
// @Tags 文章管理
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "文章ID"
// @Param request body dto.UpdateArticleRequest true "文章信息"
// @Success 200 {object} response.Response "更新成功"
// @Failure 400 {object} response.Response "请求参数错误"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /articles/{id} [put]
func (s *ArticleService) Update(c *gin.Context) {
	var idReq dto.IDRequest
	if err := c.ShouldBindUri(&idReq); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	var req dto.UpdateArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	resp, err := s.articleUseCase.Update(idReq.ID, &req)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, resp)
}

// Delete 删除文章
// @Summary 删除文章
// @Description 根据ID删除文章
// @Tags 文章管理
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "文章ID"
// @Success 200 {object} response.Response "删除成功"
// @Failure 400 {object} response.Response "请求参数错误"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /articles/{id} [delete]
func (s *ArticleService) Delete(c *gin.Context) {
	var req dto.IDRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := s.articleUseCase.Delete(req.ID); err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// GetByID 根据 ID 查询文章
// @Summary 获取文章详情
// @Description 根据ID获取文章详细信息
// @Tags 文章管理
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "文章ID"
// @Success 200 {object} response.Response "获取成功"
// @Failure 400 {object} response.Response "请求参数错误"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /articles/{id} [get]
func (s *ArticleService) GetByID(c *gin.Context) {
	var req dto.IDRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	resp, err := s.articleUseCase.GetByID(req.ID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, resp)
}

// List 查询文章列表
// @Summary 获取文章列表
// @Description 分页获取文章列表，支持筛选和搜索
// @Tags 文章管理
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Param category query string false "分类"
// @Param tag query string false "标签"
// @Param status query string false "状态"
// @Param keyword query string false "搜索关键词"
// @Param sort query string false "排序方式" default(latest)
// @Success 200 {object} response.Response "获取成功"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /blog/articles [get]
func (s *ArticleService) List(c *gin.Context) {
	var req dto.ArticleListRequest

	// 解析分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	// 如果传了page_size，优先使用page_size
	if pageSize > 0 {
		limit = pageSize
	}
	req.Page = page
	req.Limit = limit

	// 解析过滤参数
	req.Category = c.Query("category")
	req.CategoryID = c.Query("category_id")
	req.Tag = c.Query("tag")
	req.TagID = c.Query("tag_id")
	req.ChapterID = c.Query("chapter_id")
	req.Status = c.Query("status")
	req.Keyword = c.Query("keyword")
	req.Sort = c.DefaultQuery("sort", "latest") // 默认按最新排序

	// 调试日志
	fmt.Printf("[文章列表] ChapterID: %s, Status: %s, Keyword: %s\n", req.ChapterID, req.Status, req.Keyword)

	resp, err := s.articleUseCase.List(&req)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.SuccessWithPage(c, resp.Data, resp.Total, resp.Page, resp.Limit)
}

// UpdateStatus 更新文章状态
// @Summary 更新文章状态
// @Description 更新文章的发布状态（草稿/已发布）
// @Tags 文章管理
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "文章ID"
// @Param request body dto.UpdateArticleStatusRequest true "状态信息"
// @Success 200 {object} response.Response "更新成功"
// @Failure 400 {object} response.Response "请求参数错误"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /articles/{id}/status [patch]
func (s *ArticleService) UpdateStatus(c *gin.Context) {
	var idReq dto.IDRequest
	if err := c.ShouldBindUri(&idReq); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	var req dto.UpdateArticleStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := s.articleUseCase.UpdateStatus(idReq.ID, req.Status); err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// UpdatePin 更新文章置顶状态
func (s *ArticleService) UpdatePin(c *gin.Context) {
	var idReq dto.IDRequest
	if err := c.ShouldBindUri(&idReq); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	var req dto.UpdateArticlePinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := s.articleUseCase.UpdatePin(idReq.ID, req.IsPinned); err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Search 搜索文章
// @Summary 搜索文章
// @Description 根据关键词搜索文章
// @Tags 博客前台
// @Accept json
// @Produce json
// @Param keyword query string true "搜索关键词"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Param sort query string false "排序方式" default(latest)
// @Success 200 {object} response.Response "搜索成功"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /blog/articles/search [get]
func (s *ArticleService) Search(c *gin.Context) {
	keyword := c.Query("keyword")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	// 如果传了page_size，优先使用page_size
	if pageSize > 0 {
		limit = pageSize
	}
	sort := c.DefaultQuery("sort", "latest") // 默认按最新排序

	// 解析分类ID和标签ID(可选)
	var categoryID, tagID uint
	if cid := c.Query("category_id"); cid != "" {
		if id, err := strconv.ParseUint(cid, 10, 32); err == nil {
			categoryID = uint(id)
		}
	}
	if tid := c.Query("tag_id"); tid != "" {
		if id, err := strconv.ParseUint(tid, 10, 32); err == nil {
			tagID = uint(id)
		}
	}

	resp, err := s.articleUseCase.Search(keyword, page, limit, sort, categoryID, tagID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.SuccessWithPage(c, resp.Data, resp.Total, resp.Page, resp.Limit)
}

// Archive 获取归档文章
// @Summary 获取归档文章
// @Description 获取文章归档列表，按时间归档
// @Tags 博客前台
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(100)
// @Success 200 {object} response.Response "获取成功"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /blog/articles/archive [get]
func (s *ArticleService) Archive(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "500"))

	resp, err := s.articleUseCase.Archive(page, limit)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.SuccessWithPage(c, resp.Data, resp.Total, resp.Page, resp.Limit)
}

// BatchDelete 批量删除
// @Summary 批量删除文章
// @Description 批量删除多篇文章
// @Tags 文章管理
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.BatchDeleteRequest true "删除文章ID列表"
// @Success 200 {object} response.Response "删除成功"
// @Failure 400 {object} response.Response "请求参数错误"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /articles/batch-delete [post]
func (s *ArticleService) BatchDelete(c *gin.Context) {
	var req dto.BatchDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := s.articleUseCase.BatchDelete(req.ArticleIDs); err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"deleted": len(req.ArticleIDs),
	})
}

type sitemapURLSet struct {
	XMLName xml.Name     `xml:"urlset"`
	Xmlns   string       `xml:"xmlns,attr"`
	URLs    []sitemapURL `xml:"url"`
}

type sitemapURL struct {
	Loc        string `xml:"loc"`
	LastMod    string `xml:"lastmod,omitempty"`
	ChangeFreq string `xml:"changefreq,omitempty"`
	Priority   string `xml:"priority,omitempty"`
}

// Sitemap 生成站点地图
// @Summary 生成 Sitemap
// @Description 输出已发布文章的 sitemap.xml
// @Tags 博客前台
// @Produce xml
// @Success 200 "XML"
// @Router /sitemap.xml [get]
func (s *ArticleService) Sitemap(c *gin.Context) {
	articles, err := s.articleUseCase.ListPublished(5000)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	baseURL := getPublicBaseURL(c)
	urls := []sitemapURL{
		{
			Loc:        baseURL + "/",
			ChangeFreq: "daily",
			Priority:   "1.0",
		},
		{
			Loc:        baseURL + "/articles",
			ChangeFreq: "daily",
			Priority:   "0.9",
		},
		{
			Loc:        baseURL + "/archive",
			ChangeFreq: "weekly",
			Priority:   "0.6",
		},
		{
			Loc:        baseURL + "/notes",
			ChangeFreq: "weekly",
			Priority:   "0.6",
		},
	}

	for _, article := range articles {
		urls = append(urls, sitemapURL{
			Loc:        fmt.Sprintf("%s/articles/%d", baseURL, article.ID),
			LastMod:    article.CreatedAt.Format("2006-01-02"),
			ChangeFreq: "monthly",
			Priority:   "0.8",
		})
	}

	payload := sitemapURLSet{
		Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  urls,
	}

	output, err := xml.MarshalIndent(payload, "", "  ")
	if err != nil {
		response.ServerError(c, "生成 Sitemap 失败")
		return
	}

	c.Data(http.StatusOK, "application/xml; charset=utf-8", append([]byte(xml.Header), output...))
}

type rssFeed struct {
	XMLName xml.Name   `xml:"rss"`
	Version string     `xml:"version,attr"`
	Channel rssChannel `xml:"channel"`
}

type rssChannel struct {
	Title       string    `xml:"title"`
	Link        string    `xml:"link"`
	Description string    `xml:"description"`
	Language    string    `xml:"language"`
	LastBuild   string    `xml:"lastBuildDate,omitempty"`
	Items       []rssItem `xml:"item"`
}

type rssItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	GUID        string `xml:"guid"`
	Description string `xml:"description,cdata"`
	PubDate     string `xml:"pubDate"`
	Category    string `xml:"category,omitempty"`
}

// RSS 生成 RSS 订阅
// @Summary 生成 RSS
// @Description 输出最新文章 feed.xml
// @Tags 博客前台
// @Produce xml
// @Success 200 "XML"
// @Router /feed.xml [get]
func (s *ArticleService) RSS(c *gin.Context) {
	articles, err := s.articleUseCase.ListPublished(50)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	baseURL := getPublicBaseURL(c)
	items := make([]rssItem, 0, len(articles))
	for _, article := range articles {
		link := fmt.Sprintf("%s/articles/%d", baseURL, article.ID)
		category := ""
		if article.Category != nil {
			category = article.Category.Name
		}
		items = append(items, rssItem{
			Title:       article.Title,
			Link:        link,
			GUID:        link,
			Description: article.Summary,
			PubDate:     article.CreatedAt.Format(time.RFC1123Z),
			Category:    category,
		})
	}

	feed := rssFeed{
		Version: "2.0",
		Channel: rssChannel{
			Title:       "个人博客",
			Link:        baseURL + "/",
			Description: "记录技术实践与生活片段",
			Language:    "zh-CN",
			LastBuild:   time.Now().Format(time.RFC1123Z),
			Items:       items,
		},
	}

	output, err := xml.MarshalIndent(feed, "", "  ")
	if err != nil {
		response.ServerError(c, "生成 RSS 失败")
		return
	}

	c.Data(http.StatusOK, "application/rss+xml; charset=utf-8", append([]byte(xml.Header), output...))
}

func getPublicBaseURL(c *gin.Context) string {
	proto := c.GetHeader("X-Forwarded-Proto")
	if proto == "" {
		if c.Request.TLS != nil {
			proto = "https"
		} else {
			proto = "http"
		}
	}

	host := c.GetHeader("X-Forwarded-Host")
	if host == "" {
		host = c.Request.Host
	}

	return strings.TrimRight(proto+"://"+host, "/")
}
