package markdown

import (
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/ydcloud-dy/leaf-api/pkg/oss"
)

// ImageProcessor Markdown 图片处理器
type ImageProcessor struct {
	folder string // OSS 文件夹名称
}

// NewImageProcessor 创建图片处理器
// uploadDir 和 baseURL 参数保留用于兼容性,但实际使用 OSS
func NewImageProcessor(uploadDir, baseURL string) *ImageProcessor {
	return &ImageProcessor{
		folder: "articles", // 使用 articles 文件夹,与手动上传图片保持一致
	}
}

// ProcessMarkdownImages 处理 Markdown 中的图片
// 下载所有外部图片并上传到OSS,替换为OSS/本地链接
func (p *ImageProcessor) ProcessMarkdownImages(content string) (string, error) {
	// 匹配 Markdown 图片语法: ![alt](url)
	imgRegex := regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)

	// 查找所有图片
	matches := imgRegex.FindAllStringSubmatch(content, -1)
	if len(matches) == 0 {
		fmt.Println("[图片处理] 未找到任何图片链接")
		return content, nil
	}

	fmt.Printf("[图片处理] 找到 %d 个图片链接\n", len(matches))

	// 处理每个图片
	for _, match := range matches {
		if len(match) < 3 {
			continue
		}

		originalURL := match[2]
		alt := match[1]

		// 跳过已经是OSS或本地图片的情况
		if strings.HasPrefix(originalURL, "/uploads/") ||
			strings.Contains(originalURL, "oss-cn-") ||
			strings.Contains(originalURL, "aliyuncs.com") {
			fmt.Printf("[图片处理] 跳过已处理的图片: %s\n", originalURL)
			continue
		}

		fmt.Printf("[图片处理] 开始下载图片: %s\n", originalURL)

		// 下载图片并上传到OSS
		uploadedURL, err := p.downloadAndUploadImage(originalURL)
		if err != nil {
			fmt.Printf("[图片处理] 处理图片失败 %s: %v\n", originalURL, err)
			continue
		}

		fmt.Printf("[图片处理] 图片上传成功,URL: %s\n", uploadedURL)

		// 替换图片链接
		oldPattern := fmt.Sprintf("![%s](%s)", alt, originalURL)
		newPattern := fmt.Sprintf("![%s](%s)", alt, uploadedURL)
		content = strings.ReplaceAll(content, oldPattern, newPattern)
	}

	return content, nil
}

// downloadAndUploadImage 下载图片并上传到OSS
func (p *ImageProcessor) downloadAndUploadImage(url string) (string, error) {
	// 创建 HTTP 客户端
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// 尝试直接下载
	imgData, contentType, err := p.tryDownload(client, url)
	if err != nil {
		// 如果是语雀图片且下载失败,尝试使用图片代理
		if strings.Contains(url, "cdn.nlark.com") || strings.Contains(url, "yuque.com") {
			fmt.Printf("[图片处理] 直接下载失败,尝试使用图片代理\n")
			proxyURL := "https://images.weserv.nl/?url=" + url
			imgData, contentType, err = p.tryDownload(client, proxyURL)
			if err != nil {
				return "", fmt.Errorf("代理下载也失败: %w", err)
			}
		} else {
			return "", err
		}
	}

	// 获取文件扩展名
	ext := filepath.Ext(url)
	if ext == "" || len(ext) > 5 {
		ext = getExtByContentType(contentType)
	}

	// 生成 OSS 文件路径: articles/2025/11/28/uuid.ext
	filename := fmt.Sprintf("%s/%s/%s%s",
		p.folder,
		time.Now().Format("2006/01/02"),
		uuid.New().String(),
		ext,
	)

	// 上传到 OSS (如果 OSS 不可用会自动fallback到本地存储)
	uploadedURL, err := oss.UploadBytes(imgData, filename)
	if err != nil {
		return "", fmt.Errorf("上传失败: %w", err)
	}

	return uploadedURL, nil
}

// tryDownload 尝试下载图片,返回图片数据和 Content-Type
func (p *ImageProcessor) tryDownload(client *http.Client, url string) ([]byte, string, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, "", fmt.Errorf("创建请求失败: %w", err)
	}

	// 设置请求头绕过防盗链
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://www.yuque.com/")
	req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")

	resp, err := client.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("下载图片失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("HTTP 状态码错误: %d", resp.StatusCode)
	}

	imgData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("读取图片数据失败: %w", err)
	}

	contentType := resp.Header.Get("Content-Type")
	return imgData, contentType, nil
}

// getExtByContentType 根据 Content-Type 获取文件扩展名
func getExtByContentType(contentType string) string {
	contentType = strings.ToLower(contentType)

	switch {
	case strings.Contains(contentType, "jpeg"), strings.Contains(contentType, "jpg"):
		return ".jpg"
	case strings.Contains(contentType, "png"):
		return ".png"
	case strings.Contains(contentType, "gif"):
		return ".gif"
	case strings.Contains(contentType, "webp"):
		return ".webp"
	case strings.Contains(contentType, "svg"):
		return ".svg"
	default:
		return ".jpg"
	}
}

// CleanMarkdownContent 清理 Markdown 内容中的多余符号
func CleanMarkdownContent(content string) string {
	// 1. `<font  替换成 <font
	content = strings.ReplaceAll(content, "`<font ", "<font ")

	// 2. /font>` 替换成 /font>
	content = strings.ReplaceAll(content, "/font>`", "/font>")

	// 3. `**<font 替换成 **<font
	content = strings.ReplaceAll(content, "`**<font ", "**<font ")

	// 4. /font>**` 替换成 /font>**
	content = strings.ReplaceAll(content, "/font>**`", "/font>**")

	return content
}
