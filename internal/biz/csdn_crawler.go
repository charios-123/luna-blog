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

	"github.com/PuerkitoBio/goquery"
	"github.com/ydcloud-dy/leaf-api/pkg/logger"
	"golang.org/x/net/html"
)

// CSDNArticle CSDN 搜索接口返回的单篇文章结构
type CSDNArticle struct {
	Title       string
	URL         string
	Body        string
	Description string
	Author      string
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
	pageSize      int
	maxPerKeyword int
}

// NewCSDNCrawler 创建 CSDN 爬虫实例
func NewCSDNCrawler() *CSDNCrawler {
	transport := &http.Transport{
		MaxIdleConns:        10,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
		ForceAttemptHTTP2:   false,
	}

	return &CSDNCrawler{
		httpClient: &http.Client{
			Timeout:   30 * time.Second,
			Transport: transport,
		},
		pageSize:      1,
		maxPerKeyword: 10,
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
		time.Sleep(800 * time.Millisecond)
	}

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

// canonicalizeCSDNURL 去掉 CSDN URL 中的追踪参数
func canonicalizeCSDNURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		if idx := strings.Index(raw, "?"); idx > 0 {
			return raw[:idx]
		}
		return raw
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return parsed.String()
}

// parseCSDNTime 解析发布时间
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

// FetchArticlePage 抓取文章详情页并提取正文内容,再转为 Markdown
func (c *CSDNCrawler) FetchArticlePage(articleURL string) (string, error) {
	var lastErr error
	maxAttempts := 5 // 增加到5次重试

	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 {
			// 递增延迟: 2s, 4s, 8s, 16s
			delay := time.Duration(1<<uint(attempt)) * 2 * time.Second
			time.Sleep(delay)
		}

		req, err := http.NewRequest(http.MethodGet, articleURL, nil)
		if err != nil {
			lastErr = fmt.Errorf("create request failed: %w", err)
			continue
		}

		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
		req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
		req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
		req.Header.Set("Connection", "keep-alive")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("request failed: %w", err)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			lastErr = fmt.Errorf("unexpected status: %d", resp.StatusCode)
			// 对于 521 错误,继续重试(可能是临时问题)
			if resp.StatusCode == 521 {
				continue
			}
			// 对于其他错误,也继续重试
			continue
		}

		doc, err := goquery.NewDocumentFromReader(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("parse html failed: %w", err)
			continue
		}

		articleNode := extractArticleNode(doc)
		if articleNode == nil {
			lastErr = fmt.Errorf("article content not found")
			continue
		}

		articleNodeHtml, err := articleNode.Html()
		if err != nil {
			lastErr = fmt.Errorf("get html failed: %w", err)
			continue
		}

		md := htmlToMarkdownV2(articleNodeHtml)
		md = cleanMarkdownSimple(md)

		if md == "" {
			lastErr = fmt.Errorf("converted markdown is empty")
			continue
		}

		logger.Info(fmt.Sprintf("FetchArticlePage: url=%s, markdown_len=%d", articleURL, len(md)))
		return md, nil
	}

	return "", fmt.Errorf("all attempts failed: %v", lastErr)
}

// extractArticleNode 使用 goquery 从 CSDN 页面中提取文章正文节点
func extractArticleNode(doc *goquery.Document) *goquery.Selection {
	selectors := []string{
		"div#article_content",
		"article[itemprop='articleBody']",
		"div.blog-content-box",
		"article.blog-content-box",
		"div.article-content",
		"article.article-content",
		".blog-content",
		".content",
		"main",
	}

	for _, sel := range selectors {
		selection := doc.Find(sel)
		if selection.Length() > 0 {
			cleanArticleNode(selection)
			return selection
		}
	}

	selection := findBestTextBlock(doc)
	if selection.Length() > 0 {
		cleanArticleNode(selection)
		return selection
	}

	return nil
}

// cleanArticleNode 清理正文节点中的无关元素
func cleanArticleNode(selection *goquery.Selection) {
	selection.Find("script, style, iframe, noscript, svg, canvas").Each(func(i int, s *goquery.Selection) {
		s.Remove()
	})

	removeSelectors := []string{
		".csdn-side-toolbar",
		".copyright-box",
		".article-copyright",
		".recommend-box",
		".recommend-item-box",
		".blog-extend-box",
		".blog-bottom-box",
		".follow-nickname-box",
		".article-info-box",
		".bdshare_tpl",
		".ds-footer-wrapper",
		".hide-article-box",
		".tooltip",
		".aside",
		"[class*='recommend']",
		"[class*='copyright']",
		"[class*='share']",
		"[class*='toolbar']",
		"[class*='follow']",
		"[class*='sidebar']",
		"[class*='aside']",
		"[class*='nav']",
		"[class*='footer']",
	}

	for _, sel := range removeSelectors {
		selection.Find(sel).Each(func(i int, s *goquery.Selection) {
			s.Remove()
		})
	}

	selection.Find("div, section, article, span, p").Each(func(i int, s *goquery.Selection) {
		if strings.TrimSpace(s.Text()) == "" && s.Find("img, video, iframe, pre, code").Length() == 0 {
			s.Remove()
		}
	})

	// 处理各种懒加载属性,统一迁移到src
	lazyAttrs := []string{"data-src", "data-original", "data-lazy-src", "data-url", "data-echo", "data-lazy"}
	selection.Find("img").Each(func(i int, s *goquery.Selection) {
		src, srcExists := s.Attr("src")
		// 如果src为空或是占位图,尝试从懒加载属性中恢复真实URL
		if !srcExists || src == "" || strings.HasPrefix(src, "data:image") {
			for _, attr := range lazyAttrs {
				if val, exists := s.Attr(attr); exists && val != "" && !strings.HasPrefix(val, "data:image") {
					s.SetAttr("src", val)
					s.RemoveAttr(attr)
					break
				}
			}
		}
		// 清理srcset(避免Markdown渲染混乱)
		s.RemoveAttr("srcset")
	})
}

// findBestTextBlock 找到页面中最可能是正文的块级元素
func findBestTextBlock(doc *goquery.Document) *goquery.Selection {
	var bestSelection *goquery.Selection
	bestScore := 0

	doc.Find("div, article, section").Each(func(i int, s *goquery.Selection) {
		pCount := s.Find("p").Length()
		text := strings.TrimSpace(s.Text())
		textLen := len(text)

		if textLen < 200 {
			return
		}

		linkCount := s.Find("a").Length()
		if linkCount > 20 && pCount < 3 {
			return
		}

		score := pCount*1000 + textLen
		if score > bestScore {
			bestScore = score
			bestSelection = s
		}
	})

	if bestScore == 0 {
		return nil
	}
	return bestSelection
}

// ============================================================
// htmlToMarkdownV2 - 使用 golang.org/x/net/html 进行单遍递归树遍历
// 这是彻底重写的版本,避免了多轮 DOM 操作导致的内容损坏
// ============================================================

// htmlToMarkdownV2 将 HTML 内容转换为 Markdown
// 使用 golang.org/x/net/html 解析器进行单遍递归遍历,保证:
// 1. 元素按文档顺序处理
// 2. 每个节点只处理一次
// 3. 不修改原始 DOM,避免内容损坏
func htmlToMarkdownV2(htmlContent string) string {
	doc, err := html.Parse(strings.NewReader(htmlContent))
	if err != nil {
		return extractPlainText(htmlContent)
	}

	var result strings.Builder
	// 从 body 节点开始,跳过 head 等无关内容
	if bodyNode := findBodyNode(doc); bodyNode != nil {
		walkChildren(bodyNode, &result, false)
	} else {
		// 如果没有 body,直接从根节点开始遍历
		walkHTMLNode(doc, &result, false)
	}

	md := result.String()
	return md
}

// findBodyNode 在解析树中查找 <body> 节点
func findBodyNode(node *html.Node) *html.Node {
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == html.ElementNode && child.Data == "body" {
			return child
		}
		if found := findBodyNode(child); found != nil {
			return found
		}
	}
	return nil
}

// walkHTMLNode 递归遍历 HTML 节点,生成 Markdown
// inPre: 当前是否在 <pre> 块内(代码内容原样输出)
func walkHTMLNode(node *html.Node, sb *strings.Builder, inPre bool) {
	if node == nil {
		return
	}

	switch node.Type {
	case html.ElementNode:
		tag := node.Data
		switch tag {
		case "h1", "h2", "h3", "h4", "h5", "h6":
			level := int(tag[1] - '0')
			pad := strings.Repeat("#", level)
			var innerSb strings.Builder
			walkChildren(node, &innerSb, inPre)
			text := strings.TrimSpace(innerSb.String())
			if text != "" {
				sb.WriteString(fmt.Sprintf("\n\n%s %s\n\n", pad, text))
			}

		case "pre":
			var innerSb strings.Builder
			walkChildrenRawText(node, &innerSb)
			codeText := strings.TrimSpace(innerSb.String())
			if codeText != "" {
				// 如果 <pre> 内容非常长,可能是文章正文而非代码
				// 当内容超过500字符且包含多个段落时,视为正文内容
				if len([]rune(codeText)) > 500 && strings.Count(codeText, "\n") > 5 {
					sb.WriteString("\n\n")
					sb.WriteString(codeText)
					sb.WriteString("\n\n")
				} else {
					sb.WriteString(fmt.Sprintf("\n\n```\n%s\n```\n\n", codeText))
				}
			}

		case "code":
			if inPre {
				// 在 <pre> 内,代码内容原样输出
				var innerSb strings.Builder
				walkChildrenRawText(node, &innerSb)
				sb.WriteString(innerSb.String())
			} else {
				var innerSb strings.Builder
				walkChildrenRawText(node, &innerSb)
				text := strings.TrimSpace(innerSb.String())
				if text != "" {
					sb.WriteString(fmt.Sprintf("`%s`", text))
				}
			}

		case "img":
			src := getHTMLAttr(node, "src")
			alt := getHTMLAttr(node, "alt")
			// 尝试多种懒加载属性
			if src == "" || strings.HasPrefix(src, "data:image") {
				for _, attr := range []string{"data-src", "data-original", "data-lazy-src", "data-url", "data-echo"} {
					if val := getHTMLAttr(node, attr); val != "" && !strings.HasPrefix(val, "data:image") {
						src = val
						break
					}
				}
			}
			// 过滤CSDN UI图标(非正文图片)
			if isCSDNUIIcon(src, getHTMLAttr(node, "class")) {
				return
			}
			// 去掉URL中的锚点(如#pic_center)
			src = strings.Split(src, "#")[0]
			if src != "" {
				// 清理无意义的占位符alt文本
				alt = cleanImageAlt(alt)
				sb.WriteString(fmt.Sprintf("\n\n![%s](%s)\n\n", alt, src))
			}

		case "br":
			sb.WriteString("\n")

		case "hr":
			sb.WriteString("\n\n---\n\n")

		case "ol":
			renderList(node, sb, true, inPre)

		case "ul":
			renderList(node, sb, false, inPre)

		case "li":
			// 处理不在 <ul>/<ol> 内的 <li> 元素
			var innerSb strings.Builder
			walkChildren(node, &innerSb, inPre)
			text := strings.TrimSpace(innerSb.String())
			if text != "" {
				sb.WriteString(fmt.Sprintf("- %s\n", text))
			}

		case "table":
			renderTable(node, sb, inPre)

		case "blockquote":
			var innerSb strings.Builder
			walkChildren(node, &innerSb, inPre)
			text := strings.TrimSpace(innerSb.String())
			if text != "" {
				lines := strings.Split(text, "\n")
				for _, line := range lines {
					trimmed := strings.TrimSpace(line)
					if trimmed != "" {
						sb.WriteString(fmt.Sprintf("> %s\n", trimmed))
					}
				}
				sb.WriteString("\n")
			}

		case "p":
			var innerSb strings.Builder
			walkChildren(node, &innerSb, inPre)
			text := strings.TrimSpace(innerSb.String())
			if text != "" {
				sb.WriteString(text)
				sb.WriteString("\n\n")
			}

		case "strong", "b":
			var innerSb strings.Builder
			walkChildren(node, &innerSb, inPre)
			text := strings.TrimSpace(innerSb.String())
			if text != "" {
				sb.WriteString(fmt.Sprintf("**%s**", text))
			}

		case "em", "i":
			var innerSb strings.Builder
			walkChildren(node, &innerSb, inPre)
			text := strings.TrimSpace(innerSb.String())
			if text != "" {
				sb.WriteString(fmt.Sprintf("*%s*", text))
			}

		case "a":
			href := getHTMLAttr(node, "href")
			var innerSb strings.Builder
			walkChildren(node, &innerSb, inPre)
			text := strings.TrimSpace(innerSb.String())
			if href != "" && text != "" && !strings.HasPrefix(href, "#") {
				sb.WriteString(fmt.Sprintf("[%s](%s)", text, href))
			} else if text != "" {
				sb.WriteString(text)
			}

		case "div", "section", "article", "main", "aside", "nav", "header", "footer", "figure", "figcaption":
			// 块级元素: 添加前后换行以保持段落间距
			sb.WriteString("\n")
			walkChildren(node, sb, inPre)
			sb.WriteString("\n")

		case "script", "style", "noscript", "head", "title", "meta", "link":
			// 跳过这些元素的内容

		default:
			// 其他元素(span 等)递归处理子节点,不添加额外换行
			walkChildren(node, sb, inPre)
		}

	case html.TextNode:
		text := node.Data
		if inPre {
			sb.WriteString(text)
		} else {
			trimmed := strings.TrimSpace(text)
			if trimmed != "" {
				sb.WriteString(trimmed)
			} else if containsNewline(text) {
				sb.WriteString("\n")
			}
		}

	case html.DoctypeNode, html.CommentNode:
		// 跳过

	case html.ErrorNode:
		// 结束

	}
}

// walkChildren 遍历子节点
func walkChildren(node *html.Node, sb *strings.Builder, inPre bool) {
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		walkHTMLNode(child, sb, inPre)
	}
}

// walkChildrenRawText 遍历子节点,输出纯文本(不做 Markdown 转换)
// 用于 <pre> 和 <code> 内部
func walkChildrenRawText(node *html.Node, sb *strings.Builder) {
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == html.TextNode {
			sb.WriteString(child.Data)
		} else if child.Type == html.ElementNode {
			switch child.Data {
			case "br":
				sb.WriteString("\n")
			case "script", "style":
				// 跳过
			default:
				walkChildrenRawText(child, sb)
			}
		}
	}
}

// renderList 渲染有序/无序列表
func renderList(node *html.Node, sb *strings.Builder, ordered bool, inPre bool) {
	index := 1
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == html.ElementNode && child.Data == "li" {
			var innerSb strings.Builder
			walkChildren(child, &innerSb, inPre)
			text := strings.TrimSpace(innerSb.String())
			if text != "" {
				prefix := "- "
				if ordered {
					prefix = fmt.Sprintf("%d. ", index)
				}
				// 处理多行列表项:后续行添加缩进
				lines := strings.Split(text, "\n")
				for i, line := range lines {
					trimmed := strings.TrimSpace(line)
					if i == 0 {
						sb.WriteString(prefix)
						sb.WriteString(trimmed)
						sb.WriteString("\n")
					} else if trimmed != "" {
						sb.WriteString("  ")
						sb.WriteString(trimmed)
						sb.WriteString("\n")
					}
				}
				index++
			}
		}
	}
	sb.WriteString("\n")
}

// renderTable 渲染表格
func renderTable(node *html.Node, sb *strings.Builder, inPre bool) {
	var rows [][]string
	hasHeader := false

	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == html.ElementNode && child.Data == "tr" {
			var cells []string
			isHeaderRow := false
			for td := child.FirstChild; td != nil; td = td.NextSibling {
				if td.Type == html.ElementNode && (td.Data == "td" || td.Data == "th") {
					var innerSb strings.Builder
					walkChildren(td, &innerSb, inPre)
					cells = append(cells, strings.TrimSpace(innerSb.String()))
					if td.Data == "th" {
						isHeaderRow = true
					}
				}
			}
			if len(cells) > 0 {
				rows = append(rows, cells)
				if isHeaderRow {
					hasHeader = true
				}
			}
		}
	}

	if len(rows) > 0 {
		for i, row := range rows {
			sb.WriteString("| " + strings.Join(row, " | ") + " |\n")
			if i == 0 && hasHeader {
				separators := make([]string, len(row))
				for j := range separators {
					separators[j] = "---"
				}
				sb.WriteString("| " + strings.Join(separators, " | ") + " |\n")
			}
		}
		sb.WriteString("\n")
	}
}

// getHTMLAttr 获取 HTML 节点的属性值
func getHTMLAttr(node *html.Node, key string) string {
	for _, attr := range node.Attr {
		if attr.Key == key {
			return attr.Val
		}
	}
	return ""
}

// containsNewline 检查字符串是否包含换行符
func containsNewline(s string) bool {
	return strings.Contains(s, "\n") || strings.Contains(s, "\r")
}

// extractPlainText 从 HTML 中提取纯文本(回退方案)
func extractPlainText(html string) string {
	text := regexp.MustCompile(`<[^>]+>`).ReplaceAllString(html, " ")
	text = decodeHTMLEntities(text)
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	return strings.TrimSpace(text)
}

// cleanMarkdownSimple 简化版 Markdown 清理
// 仅做基本清理:解码 HTML 实体、合并多余空行、清理首尾空白
// 不做破坏性的智能分段或标签剥离
func cleanMarkdownSimple(md string) string {
	// 解码 HTML 实体
	md = decodeHTMLEntities(md)

	// 合并 3 个以上连续空行为 2 个
	md = regexp.MustCompile(`\n{3,}`).ReplaceAllString(md, "\n\n")

	// 清理每行末尾空格
	lines := strings.Split(md, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimRight(line, " \t")
	}
	md = strings.Join(lines, "\n")

	// 再次合并多余空行
	md = regexp.MustCompile(`\n{3,}`).ReplaceAllString(md, "\n\n")

	// 移除开头和结尾的空行
	md = strings.TrimSpace(md)

	// 移除可能残留的 HTML 标签(如 <p>, <a> 等)
	// 仅处理常见的闭合标签,不做过度处理
	md = regexp.MustCompile(`<br\s*/?>`).ReplaceAllString(md, "\n")
	md = regexp.MustCompile(`</?(span|div|section|article)[^>]*>`).ReplaceAllString(md, "")

	return md
}

// ============================================================
// HTML 实体解码
// ============================================================

var htmlEntityMap = map[string]string{
	"&nbsp;":     " ",
	"&bsp;":      " ",
	"&amp;":      "&",
	"&lt;":       "<",
	"&gt;":       ">",
	"&quot;":     "\"",
	"&apos;":     "'",
	"&ldquo;":    "\"",
	"&rdquo;":    "\"",
	"&lsquo;":    "'",
	"&rsquo;":    "'",
	"&mdash;":    "—",
	"&ndash;":    "–",
	"&hellip;":   "…",
	"&bull;":     "•",
	"&copy;":     "©",
	"&reg;":      "®",
	"&trade;":    "™",
	"&permil;":   "‰",
	"&prime;":    "′",
	"&Prime;":    "″",
	"&cent;":     "¢",
	"&pound;":    "£",
	"&yen;":      "¥",
	"&euro;":     "€",
	"&dollar;":   "$",
	"&deg;":      "°",
	"&sup2;":     "²",
	"&sup3;":     "³",
	"&frac12;":   "½",
	"&frac14;":   "¼",
	"&frac34;":   "¾",
	"&alpha;":    "α",
	"&beta;":     "β",
	"&gamma;":    "γ",
	"&delta;":    "δ",
	"&epsilon;":  "ε",
	"&theta;":    "θ",
	"&lambda;":   "λ",
	"&mu;":       "μ",
	"&pi;":       "π",
	"&sigma;":    "σ",
	"&omega;":    "ω",
	"&sum;":      "Σ",
	"&prod;":     "Π",
	"&int;":      "∫",
	"&radic;":    "√",
	"&infin;":    "∞",
	"&ne;":       "≠",
	"&le;":       "≤",
	"&ge;":       "≥",
	"&sub;":      "⊂",
	"&supe;":     "⊃",
	"&perp;":     "⊥",
	"&parallel;": "∥",
	"&sdot;":     "⋅",
	"&times;":    "×",
	"&divide;":   "÷",
	"&oplus;":    "⊕",
	"&otimes;":   "⊗",
	"&prop;":     "∝",
	"&sim;":      "∼",
	"&simeq;":    "≃",
	"&approx;":   "≈",
	"&cong;":     "≅",
	"&hline;":    "─",
	"&empty;":    "∅",
	"&nabla;":    "∇",
	"&part;":     "∂",
	"&forall;":   "∀",
	"&exist;":    "∃",
	"&nexist;":   "∄",
	"&in;":       "∈",
	"&notin;":    "∉",
	"&ni;":       "∋",
	"&lceil;":    "⌈",
	"&rceil;":    "⌉",
	"&lfloor;":   "⌊",
	"&rfloor;":   "⌋",
}

var entityPattern = regexp.MustCompile(`&[a-zA-Z]+;|&#\d+;|&#x[0-9a-fA-F]+;`)

// decodeHTMLEntities 解码 HTML 实体为 Unicode 字符
func decodeHTMLEntities(s string) string {
	return entityPattern.ReplaceAllStringFunc(s, func(entity string) string {
		if val, ok := htmlEntityMap[entity]; ok {
			return val
		}
		if strings.HasPrefix(entity, "&#") && !strings.HasPrefix(entity, "&#x") {
			numStr := entity[2 : len(entity)-1]
			if num, err := strconv.Atoi(numStr); err == nil {
				return string(rune(num))
			}
		}
		if strings.HasPrefix(entity, "&#x") {
			hexStr := entity[3 : len(entity)-1]
			if num, err := strconv.ParseInt(hexStr, 16, 32); err == nil {
				return string(rune(num))
			}
		}
		return entity
	})
}

// isCSDNUIIcon 判断图片是否为CSDN的UI图标(非正文图片)
func isCSDNUIIcon(src, class string) bool {
	// CSDN UI图标通常来自这些域名/路径
	uiPatterns := []string{
		"csdnimg.cn/release",
		"csdnimg.cn/images",
		"i-operation.csdnimg.cn",
		"csdnimg.cn/static",
	}
	for _, p := range uiPatterns {
		if strings.Contains(src, p) {
			return true
		}
	}

	// CSDN UI图标的class特征
	uiClasses := []string{
		"article-read-img",
		"article-collect-img",
		"badge-icon",
		"dropdown-cover",
		"lock-img",
		"limited-img",
		"code-icon",
		"avatar",
		"header-img",
		"heard-img",
	}
	for _, c := range uiClasses {
		if strings.Contains(class, c) {
			return true
		}
	}

	return false
}

// cleanImageAlt 清理图片alt文本中的无意义占位符
// CSDN等平台的图片默认alt为"在这里插入图片描述"等无用内容,展示给用户体验差
func cleanImageAlt(alt string) string {
	alt = strings.TrimSpace(alt)

	// 常见的无意义占位符模式,命中则清空alt
	placeholders := []string{
		"在这里插入图片描述",
		"在这里插入图片",
		"插入图片描述",
		"图片描述",
		"image.png",
		"image.jpg",
		"image.jpeg",
		"image.gif",
		"default.png",
		"default.jpg",
		"null",
		"undefined",
		"pic_center",
		"pic_left",
		"pic_right",
	}

	for _, p := range placeholders {
		if alt == p || strings.HasPrefix(alt, p) || strings.HasSuffix(alt, p) {
			return ""
		}
	}

	// 如果alt长度过长(>80字符),可能是误塞的正文,也清空
	if len([]rune(alt)) > 80 {
		return ""
	}

	return alt
}
