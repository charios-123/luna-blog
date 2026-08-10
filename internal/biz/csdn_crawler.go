package biz

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/ydcloud-dy/leaf-api/pkg/logger"
)

// CSDNArticle CSDN 搜索接口返回的单篇文章结构
type CSDNArticle struct {
	Title       string
	URL         string // 规范化后的原文 URL(去掉追踪参数)
	Body        string // 内容片段
	Description string
	Author      string // 原作者 nickname
	PublishedAt time.Time
	ViewCount   int
	LikeCount   int
}

type csdnSearchResponse struct {
	ResultVos []csdnResultItem `json:"result_vos"`
	Total     int              `json:"total"`
}

type csdnResultItem struct {
	ArticleID     string `json:"articleid"`
	Title         string `json:"title"`
	URL           string `json:"url"`
	Body          string `json:"body"`
	Description   string `json:"description"`
	Digest        string `json:"digest"`
	Nickname      string `json:"nickname"`
	Username      string `json:"username"`
	Author        string `json:"author"`
	CreatedAt     string `json:"created_at"`
	CreateTime    string `json:"create_time"`
	CreateTimeStr string `json:"create_time_str"`
	View          string `json:"view"`
	ViewNum       string `json:"view_num"`
	Digg          string `json:"digg"`
	Type          string `json:"type"`
	SoType        string `json:"so_type"`
}

var (
	emTagPattern = regexp.MustCompile(`<em>|</em>`)
	htmlTagStrip = regexp.MustCompile(`<[^>]+>`)
)

// CSDNCrawler CSDN 搜索接口爬虫
type CSDNCrawler struct {
	httpClient    *http.Client
	pageSize      int // 每个关键词抓取的页数
	maxPerKeyword int // 每个关键词最多保留的文章数
}

// NewCSDNCrawler 创建 CSDN 爬虫实例
func NewCSDNCrawler() *CSDNCrawler {
	return &CSDNCrawler{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		pageSize:      1,  // 仅抓取第 1 页
		maxPerKeyword: 10, // 每个关键词最多保留 10 篇
	}
}

// FetchArticles 抓取指定关键词的文章列表
func (c *CSDNCrawler) FetchArticles(keyword string) ([]CSDNArticle, error) {
	if strings.TrimSpace(keyword) == "" {
		return nil, fmt.Errorf("keyword cannot be empty")
	}

	var allArticles []CSDNArticle
	for page := 1; page <= c.pageSize; page++ {
		articles, err := c.fetchPage(keyword, page)
		if err != nil {
			logger.Warn(fmt.Sprintf("CSDN crawl page %d failed for keyword %q: %v", page, keyword, err))
			break
		}
		if len(articles) == 0 {
			break
		}
		allArticles = append(allArticles, articles...)
		// 礼貌等待,避免请求过快
		time.Sleep(800 * time.Millisecond)
	}

	// 截断到每个关键词的上限,避免单页返回过多
	if c.maxPerKeyword > 0 && len(allArticles) > c.maxPerKeyword {
		allArticles = allArticles[:c.maxPerKeyword]
	}

	logger.Info(fmt.Sprintf("CSDN crawl completed: keyword=%q, fetched=%d articles", keyword, len(allArticles)))
	return allArticles, nil
}

func (c *CSDNCrawler) fetchPage(keyword string, page int) ([]CSDNArticle, error) {
	reqURL := buildCSDNSearchURL(keyword, page)

	req, err := http.NewRequest(http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request failed: %w", err)
	}
	// 设置常见浏览器 UA,避免被识别为爬虫
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Referer", "https://so.csdn.net/")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body failed: %w", err)
	}

	var searchResp csdnSearchResponse
	if err := json.Unmarshal(body, &searchResp); err != nil {
		return nil, fmt.Errorf("parse json failed: %w", err)
	}

	articles := make([]CSDNArticle, 0, len(searchResp.ResultVos))
	for _, item := range searchResp.ResultVos {
		// 只保留 blog 类型
		if item.Type != "" && item.Type != "blog" && item.SoType != "" && item.SoType != "blog" {
			continue
		}
		article, ok := convertCSDNItem(item)
		if !ok {
			continue
		}
		articles = append(articles, article)
	}

	return articles, nil
}

func buildCSDNSearchURL(keyword string, page int) string {
	// CSDN 搜索 API: 已验证可用
	return fmt.Sprintf(
		"https://so.csdn.net/api/v3/search?q=%s&t=all&p=%d&s=0&tm=0&lv=-1&ft=0&l=&u=&ct=-1&pnt=-1&ry=-1&ss=-1&dct=-1&vco=-1&cc=-1&sc=-1&akt=-1&art=-1&ca=-1&prs=&pre=&ecc=-1&ebc=-1&ia=1&dId=&cl=-1&scl=-1&tcl=-1&platform=pc",
		url.QueryEscape(keyword),
		page,
	)
}

// convertCSDNItem 将 CSDN API 返回的原始条目转换为规范化文章结构
func convertCSDNItem(item csdnResultItem) (CSDNArticle, bool) {
	title := sanitizeText(item.Title)
	if title == "" {
		return CSDNArticle{}, false
	}

	rawURL := item.URL
	if rawURL == "" {
		// 兜底:用 articleid 构造 URL
		if item.ArticleID != "" {
			rawURL = "https://blog.csdn.net/article/details/" + item.ArticleID
		} else {
			return CSDNArticle{}, false
		}
	}
	canonicalURL := canonicalizeCSDNURL(rawURL)
	if canonicalURL == "" {
		return CSDNArticle{}, false
	}

	author := item.Nickname
	if author == "" {
		author = item.Username
	}
	if author == "" {
		author = item.Author
	}

	desc := sanitizeText(item.Description)
	if desc == "" {
		desc = sanitizeText(item.Digest)
	}
	body := sanitizeText(item.Body)

	publishedAt := parseCSDNTime(item.CreatedAt, item.CreateTimeStr, item.CreateTime)

	return CSDNArticle{
		Title:       title,
		URL:         canonicalURL,
		Body:        body,
		Description: desc,
		Author:      author,
		PublishedAt: publishedAt,
		ViewCount:   parseCSNCount(item.ViewNum, item.View),
		LikeCount:   parseCSNCount(item.Digg),
	}, true
}

// sanitizeText 清理 <em> 高亮标签和多余空白
func sanitizeText(s string) string {
	if s == "" {
		return ""
	}
	s = emTagPattern.ReplaceAllString(s, "")
	s = htmlTagStrip.ReplaceAllString(s, "")
	return strings.TrimSpace(s)
}

// canonicalizeCSDNURL 去掉 CSDN URL 中的追踪参数,只保留路径部分
// 例如 https://blog.csdn.net/xxx/article/details/123?utm_source=... -> https://blog.csdn.net/xxx/article/details/123
func canonicalizeCSDNURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		// 解析失败,简单截取 ? 之前的部分
		if idx := strings.Index(raw, "?"); idx > 0 {
			return raw[:idx]
		}
		return raw
	}
	// 重建不含 query 的 URL
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return parsed.String()
}

// parseCSDNTime 解析发布时间,优先级:created_at > create_time_str > create_time(ms)
func parseCSDNTime(createdAt, createTimeStr, createTimeMs string) time.Time {
	formats := []string{
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	if createdAt != "" {
		for _, layout := range formats {
			if t, err := time.ParseInLocation(layout, createdAt, time.Local); err == nil {
				return t
			}
		}
	}
	if createTimeStr != "" {
		if t, err := time.ParseInLocation("2006-01-02", createTimeStr, time.Local); err == nil {
			return t
		}
	}
	if createTimeMs != "" {
		if ms, err := strconv.ParseInt(createTimeMs, 10, 64); err == nil {
			return time.UnixMilli(ms)
		}
	}
	return time.Now()
}

func parseCSNCount(values ...string) int {
	for _, v := range values {
		if n, err := strconv.Atoi(strings.TrimSpace(v)); err == nil {
			return n
		}
	}
	return 0
}
