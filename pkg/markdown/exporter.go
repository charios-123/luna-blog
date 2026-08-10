package markdown

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/ydcloud-dy/leaf-api/internal/model/po"
)

// ArticleExporter 文章导出器
type ArticleExporter struct{}

// NewArticleExporter 创建文章导出器
func NewArticleExporter() *ArticleExporter {
	return &ArticleExporter{}
}

// ExportToZip 导出文章为 ZIP 文件
func (e *ArticleExporter) ExportToZip(articles []*po.Article) ([]byte, error) {
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// 记录已下载的图片，避免重复下载
	downloadedImages := make(map[string]string) // 原始URL -> 文件名

	for _, article := range articles {
		// 生成 markdown 内容（包含 Front Matter）
		markdownContent := e.generateMarkdownWithFrontMatter(article)

		// 提取并处理图片
		processedMarkdown, imageInfos := e.extractImages(markdownContent)

		// 下载图片并替换链接
		for _, imgInfo := range imageInfos {
			// 检查是否已经下载过
			if filename, exists := downloadedImages[imgInfo.OriginalURL]; exists {
				// 替换占位符为已下载的文件名
				newPattern := fmt.Sprintf("![%s](./images/%s)", imgInfo.Alt, filename)
				processedMarkdown = strings.ReplaceAll(processedMarkdown, imgInfo.Placeholder, newPattern)
				continue
			}

			// 根据类型获取图片
			var imageData []byte
			var filename string
			var err error

			if imgInfo.Type == "local" {
				imageData, filename, err = e.readLocalImage(imgInfo.OriginalURL)
			} else {
				imageData, filename, err = e.downloadImage(imgInfo.OriginalURL)
			}

			if err != nil {
				fmt.Printf("[导出] 获取图片失败: %s - %v\n", imgInfo.OriginalURL, err)
				// 替换为原始链接
				newPattern := fmt.Sprintf("![%s](%s)", imgInfo.Alt, imgInfo.OriginalURL)
				processedMarkdown = strings.ReplaceAll(processedMarkdown, imgInfo.Placeholder, newPattern)
				continue
			}

			// 保存图片到 ZIP
			if err := e.addFileToZip(zipWriter, "images/"+filename, imageData); err != nil {
				fmt.Printf("[导出] 添加图片到 ZIP 失败: %s - %v\n", filename, err)
				continue
			}

			downloadedImages[imgInfo.OriginalURL] = filename

			// 替换占位符为实际文件名
			newPattern := fmt.Sprintf("![%s](./images/%s)", imgInfo.Alt, filename)
			processedMarkdown = strings.ReplaceAll(processedMarkdown, imgInfo.Placeholder, newPattern)
		}

		// 生成文件名：article-{id}-{title}.md
		filename := e.generateFilename(article)

		// 添加 markdown 文件到 ZIP
		if err := e.addFileToZip(zipWriter, filename, []byte(processedMarkdown)); err != nil {
			fmt.Printf("[导出] 添加文章文件到 ZIP 失败: %s - %v\n", filename, err)
			continue
		}
	}

	// 必须在返回之前关闭 zipWriter，否则 ZIP 文件不完整
	if err := zipWriter.Close(); err != nil {
		return nil, fmt.Errorf("关闭ZIP文件失败: %w", err)
	}

	return buf.Bytes(), nil
}

// generateMarkdownWithFrontMatter 生成带 Front Matter 的 Markdown
func (e *ArticleExporter) generateMarkdownWithFrontMatter(article *po.Article) string {
	// 生成 YAML Front Matter
	frontMatter := fmt.Sprintf(`---
title: %s
author: %s
category: %s
created_at: %s
updated_at: %s
status: %d
`,
		e.escapeYAMLValue(article.Title),
		e.escapeYAMLValue(article.Author.Nickname),
		e.escapeYAMLValue(article.Category.Name),
		article.CreatedAt.Format("2006-01-02 15:04:05"),
		article.UpdatedAt.Format("2006-01-02 15:04:05"),
		article.Status,
	)

	// 添加标签
	if len(article.Tags) > 0 {
		tags := "tags: ["
		for i, tag := range article.Tags {
			if i > 0 {
				tags += ", "
			}
			tags += e.escapeYAMLValue(tag.Name)
		}
		tags += "]\n"
		frontMatter += tags
	}

	frontMatter += "---\n\n"

	// 返回完整的 markdown 内容
	return frontMatter + article.ContentMarkdown
}

// ImageInfo 图片信息
type ImageInfo struct {
	Alt         string
	OriginalURL string
	Type        string // "local" 或 "remote"
	Placeholder string
}

// extractImages 提取 markdown 中的图片 URL
// 返回处理后的 markdown 和图片信息列表
func (e *ArticleExporter) extractImages(markdown string) (string, []ImageInfo) {
	// 匹配 Markdown 图片语法: ![alt](url)
	imgRegex := regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)

	var imageInfos []ImageInfo
	seen := make(map[string]bool) // 避免重复

	matches := imgRegex.FindAllStringSubmatch(markdown, -1)
	for i, match := range matches {
		if len(match) < 3 {
			continue
		}

		originalURL := match[2]
		alt := match[1]

		// 跳过已经是相对路径的图片（./images/ 等）
		if strings.HasPrefix(originalURL, "./") ||
			strings.HasPrefix(originalURL, "../") {
			continue
		}

		// 判断图片类型
		imageType := ""
		if strings.HasPrefix(originalURL, "/uploads/") {
			imageType = "local" // 本地服务器图片
		} else if strings.HasPrefix(originalURL, "http://") || strings.HasPrefix(originalURL, "https://") {
			imageType = "remote" // 远程图片
		} else {
			continue // 其他类型跳过
		}

		// 跳过已处理的相同URL
		if seen[originalURL] {
			continue
		}
		seen[originalURL] = true

		// 创建唯一占位符
		placeholder := fmt.Sprintf("__IMG_PLACEHOLDER_%d__", i)

		imageInfos = append(imageInfos, ImageInfo{
			Alt:         alt,
			OriginalURL: originalURL,
			Type:        imageType,
			Placeholder: placeholder,
		})

		// 替换所有相同URL的图片为占位符
		oldPattern := regexp.MustCompile(`!\[[^\]]*\]\(` + regexp.QuoteMeta(originalURL) + `\)`)
		markdown = oldPattern.ReplaceAllString(markdown, placeholder)
	}

	return markdown, imageInfos
}

// downloadImage 下载图片
func (e *ArticleExporter) downloadImage(url string) ([]byte, string, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, "", err
	}

	// 设置 User-Agent 和 Referer
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Referer", "https://www.google.com/")

	resp, err := client.Do(req)
	if err != nil {
		// 尝试使用图片代理（对于语雀等防盗链的图片）
		if strings.Contains(url, "cdn.nlark.com") || strings.Contains(url, "yuque.com") {
			proxyURL := "https://images.weserv.nl/?url=" + url
			return e.downloadImage(proxyURL)
		}
		return nil, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, "", fmt.Errorf("下载失败: HTTP %d", resp.StatusCode)
	}

	// 读取图片数据
	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", err
	}

	// 获取文件名和扩展名
	filename := e.extractFilename(url, resp.Header.Get("Content-Type"))

	return imageData, filename, nil
}

// readLocalImage 读取本地服务器图片
func (e *ArticleExporter) readLocalImage(urlPath string) ([]byte, string, error) {
	// urlPath 格式: /uploads/articles/2025/12/10/xxx.png
	// 转换为本地文件路径
	localPath := "." + urlPath // 变成 ./uploads/articles/...

	// 读取文件
	imageData, err := os.ReadFile(localPath)
	if err != nil {
		return nil, "", fmt.Errorf("读取本地图片失败: %w", err)
	}

	// 提取文件名
	filename := filepath.Base(urlPath)

	return imageData, filename, nil
}

// extractFilename 从 URL 提取文件名
func (e *ArticleExporter) extractFilename(url string, contentType string) string {
	// 从 URL 提取文件名
	parts := strings.Split(url, "/")
	filename := parts[len(parts)-1]

	// 移除查询参数
	filename = strings.Split(filename, "?")[0]

	// 如果没有扩展名，根据 Content-Type 判断
	if !strings.Contains(filename, ".") {
		ext := e.getExtensionFromContentType(contentType)
		filename = fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	}

	return filename
}

// getExtensionFromContentType 从 Content-Type 获取文件扩展名
func (e *ArticleExporter) getExtensionFromContentType(contentType string) string {
	switch {
	case strings.Contains(contentType, "image/jpeg"):
		return ".jpg"
	case strings.Contains(contentType, "image/png"):
		return ".png"
	case strings.Contains(contentType, "image/gif"):
		return ".gif"
	case strings.Contains(contentType, "image/webp"):
		return ".webp"
	default:
		return ".jpg"
	}
}

// addFileToZip 添加文件到 ZIP
func (e *ArticleExporter) addFileToZip(zipWriter *zip.Writer, filename string, data []byte) error {
	writer, err := zipWriter.Create(filename)
	if err != nil {
		return err
	}

	_, err = writer.Write(data)
	return err
}

// generateFilename 生成文章的文件名
func (e *ArticleExporter) generateFilename(article *po.Article) string {
	// 清理标题中的特殊字符
	title := strings.ReplaceAll(article.Title, " ", "-")
	title = strings.ReplaceAll(title, "/", "-")
	title = strings.ReplaceAll(title, "\\", "-")
	title = regexp.MustCompile(`[^a-zA-Z0-9\-]`).ReplaceAllString(title, "")

	// 限制长度
	if len(title) > 50 {
		title = title[:50]
	}

	return fmt.Sprintf("%d-%s.md", article.ID, title)
}

// escapeYAMLValue 转义 YAML 值
func (e *ArticleExporter) escapeYAMLValue(value string) string {
	// 如果包含特殊字符，用引号包围
	if strings.ContainsAny(value, ":#\"'") {
		return fmt.Sprintf("\"%s\"", strings.ReplaceAll(value, "\"", "\\\""))
	}
	return value
}
