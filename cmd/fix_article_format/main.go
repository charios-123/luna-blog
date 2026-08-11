package main

import (
	"fmt"
	"log"

	"github.com/ydcloud-dy/leaf-api/config"
	"github.com/ydcloud-dy/leaf-api/internal/model/po"
	mdutils "github.com/ydcloud-dy/leaf-api/pkg/markdown"

	"github.com/gomarkdown/markdown"
	"github.com/gomarkdown/markdown/html"
	"github.com/gomarkdown/markdown/parser"
)

func main() {
	// 加载配置
	if err := config.LoadConfig("config.yaml"); err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 初始化数据库
	if err := config.InitDatabase(); err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}

	// 查询所有已发布的文章
	var articles []po.Article
	if err := config.DB.Where("status = ?", 1).Find(&articles).Error; err != nil {
		log.Fatalf("查询文章失败: %v", err)
	}

	fmt.Printf("找到 %d 篇文章，开始处理...\n\n", len(articles))

	successCount := 0
	failCount := 0
	skipCount := 0

	// 处理每篇文章
	for i, article := range articles {
		fmt.Printf("[%d/%d] 处理文章 ID=%d, 标题=%s\n", i+1, len(articles), article.ID, article.Title)

		originalMD := article.ContentMarkdown
		if originalMD == "" {
			fmt.Println("  ✓ 跳过：内容为空")
			skipCount++
			continue
		}

		// 格式化 Markdown 内容
		formattedMD := mdutils.FormatMarkdownParagraphs(originalMD)
		formattedMD = mdutils.CleanExtraWhitespace(formattedMD)

		// 检查是否有变化
		if formattedMD == originalMD {
			fmt.Println("  ✓ 跳过：格式无需调整")
			skipCount++
			continue
		}

		// 重新生成 HTML
		htmlContent := markdownToHTML(formattedMD)

		// 更新数据库
		if err := config.DB.Model(&article).Updates(map[string]interface{}{
			"content_markdown": formattedMD,
			"content_html":      htmlContent,
		}).Error; err != nil {
			fmt.Printf("  ✗ 更新数据库失败: %v\n", err)
			failCount++
			continue
		}

		// 计算段落数变化
		originalParagraphs := countParagraphs(originalMD)
		newParagraphs := countParagraphs(formattedMD)
		fmt.Printf("  ✓ 处理成功 (%d → %d 段落)\n", originalParagraphs, newParagraphs)
		successCount++
	}

	// 输出统计信息
	fmt.Printf("\n处理完成！\n")
	fmt.Printf("总计: %d 篇文章\n", len(articles))
	fmt.Printf("成功: %d 篇\n", successCount)
	fmt.Printf("跳过: %d 篇\n", skipCount)
	fmt.Printf("失败: %d 篇\n", failCount)
}

// markdownToHTML 将 Markdown 转换为 HTML
func markdownToHTML(md string) string {
	// 创建 Markdown 解析器
	extensions := parser.CommonExtensions | parser.AutoHeadingIDs | parser.Tables
	p := parser.NewWithExtensions(extensions)

	// 解析 Markdown
	doc := p.Parse([]byte(md))

	// 渲染为 HTML
	htmlFlags := html.CommonFlags | html.HrefTargetBlank
	renderer := html.NewRenderer(html.RendererOptions{Flags: htmlFlags})
	htmlBytes := markdown.Render(doc, renderer)

	return string(htmlBytes)
}

// countParagraphs 统计段落数
func countParagraphs(md string) int {
	count := 0
	inParagraph := false

	for _, line := range splitLines(md) {
		trimmed := trimSpace(line)
		if trimmed == "" {
			if inParagraph {
				count++
				inParagraph = false
			}
		} else if isParagraphStart(trimmed) {
			if inParagraph {
				count++
			}
			inParagraph = true
		}
	}

	if inParagraph {
		count++
	}

	return count
}

// splitLines 拆分字符串为行
func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	lines = append(lines, s[start:])
	return lines
}

// trimSpace 修剪字符串两端空白
func trimSpace(s string) string {
	start := 0
	for start < len(s) && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	end := len(s)
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}

// isParagraphStart 判断是否为段落起始行
func isParagraphStart(line string) bool {
	if line == "" {
		return false
	}
	trimmed := trimSpace(line)

	// 标题
	if len(trimmed) > 0 && trimmed[0] == '#' {
		return true
	}
	// 列表
	if len(trimmed) > 1 && (trimmed[0] == '-' || trimmed[0] == '*') && trimmed[1] == ' ' {
		return true
	}
	// 有序列表
	if len(trimmed) > 2 && trimmed[0] >= '1' && trimmed[0] <= '9' && trimmed[1] == '.' && trimmed[2] == ' ' {
		return true
	}
	// 引用
	if len(trimmed) > 1 && trimmed[0] == '>' && trimmed[1] == ' ' {
		return true
	}
	// 代码块
	if len(trimmed) >= 3 && trimmed[:3] == "```" {
		return true
	}
	// 分隔线
	if trimmed == "---" {
		return true
	}

	// 普通文本行
	return true
}
