package main

import (
	"fmt"
	"log"
	"strings"
	"unicode/utf8"

	"github.com/ydcloud-dy/leaf-api/config"
	"github.com/ydcloud-dy/leaf-api/internal/model/po"

	"github.com/gomarkdown/markdown"
	"github.com/gomarkdown/markdown/html"
	"github.com/gomarkdown/markdown/parser"
)

func main() {
	if err := config.LoadConfig("config.yaml"); err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}
	if err := config.InitDatabase(); err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}

	var articles []po.Article
	if err := config.DB.Where("status = ?", 1).Find(&articles).Error; err != nil {
		log.Fatalf("查询文章失败: %v", err)
	}

	fmt.Printf("找到 %d 篇文章，开始处理...\n\n", len(articles))

	successCount := 0
	skipCount := 0
	failCount := 0

	for i, article := range articles {
		fmt.Printf("[%d/%d] 处理文章 ID=%d, 标题=%s\n", i+1, len(articles), article.ID, article.Title)

		summary := strings.TrimSpace(article.Summary)
		contentMD := article.ContentMarkdown

		if summary == "" || contentMD == "" {
			fmt.Println("  ✓ 跳过：摘要或正文为空")
			skipCount++
			continue
		}

		// 去掉正文开头的重复摘要
		newMD, removed := removeDuplicateSummary(contentMD, summary)
		if !removed {
			fmt.Println("  ✓ 跳过：正文开头无重复摘要")
			skipCount++
			continue
		}

		newMD = strings.TrimSpace(newMD)

		// 保护：如果去重后内容不足 50 字符，跳过（避免清空短文章）
		if utf8.RuneCountInString(newMD) < 50 {
			fmt.Println("  ✓ 跳过：去重后内容过短，保留原文")
			skipCount++
			continue
		}

		// 重新生成 HTML
		htmlContent := markdownToHTML(newMD)

		if err := config.DB.Model(&article).Updates(map[string]interface{}{
			"content_markdown": newMD,
			"content_html":     htmlContent,
		}).Error; err != nil {
			fmt.Printf("  ✗ 更新数据库失败: %v\n", err)
			failCount++
			continue
		}

		oldLen := utf8.RuneCountInString(contentMD)
		newLen := utf8.RuneCountInString(newMD)
		fmt.Printf("  ✓ 已删除重复摘要 (%d → %d 字符)\n", oldLen, newLen)
		successCount++
	}

	fmt.Printf("\n处理完成！\n")
	fmt.Printf("总计: %d 篇\n", len(articles))
	fmt.Printf("成功: %d 篇\n", successCount)
	fmt.Printf("跳过: %d 篇\n", skipCount)
	fmt.Printf("失败: %d 篇\n", failCount)
}

// removeDuplicateSummary 移除正文开头与摘要重复的部分
// 返回处理后的正文和是否做了修改
func removeDuplicateSummary(contentMD, summary string) (string, bool) {
	// 将正文按段落拆分
	paragraphs := strings.Split(contentMD, "\n\n")
	if len(paragraphs) == 0 {
		return contentMD, false
	}

	firstPara := strings.TrimSpace(paragraphs[0])
	if firstPara == "" {
		return contentMD, false
	}

	// 跳过 Markdown 标题行（# 开头）
	effectiveStart := 0
	for i, p := range paragraphs {
		p = strings.TrimSpace(p)
		if strings.HasPrefix(p, "#") || strings.HasPrefix(p, "!") || p == "" {
			effectiveStart = i + 1
			continue
		}
		break
	}

	if effectiveStart >= len(paragraphs) {
		return contentMD, false
	}

	firstPara = strings.TrimSpace(paragraphs[effectiveStart])

	// 去掉第一段的 Markdown 格式，得到纯文本
	plainText := stripMarkdownInline(firstPara)

	// 检查摘要是否与第一段开头匹配
	matched := matchSummaryInText(plainText, summary)
	if !matched {
		// 如果第一段不匹配，可能被格式化了多段，尝试合并前几段
		return contentMD, false
	}

	// 在正文中找到摘要结束的位置并移除
	newMD, changed := cutSummaryFromParagraph(contentMD, summary, effectiveStart, paragraphs)
	if !changed {
		return contentMD, false
	}

	return newMD, true
}

// matchSummaryInText 检查摘要是否与文本开头匹配（允许摘要被截断的情况）
func matchSummaryInText(text, summary string) bool {
	text = strings.TrimSpace(text)
	summary = strings.TrimSpace(summary)

	if len(text) == 0 || len(summary) == 0 {
		return false
	}

	textRunes := []rune(text)
	summaryRunes := []rune(summary)

	// 摘要通常是被截断的，所以比较时取较短的长度
	compareLen := len(summaryRunes)
	if compareLen > len(textRunes) {
		compareLen = len(textRunes)
	}

	// 至少需要比较 80% 的摘要长度
	minMatch := compareLen * 80 / 100
	if minMatch < 10 {
		minMatch = 10
	}

	matchCount := 0
	for i := 0; i < compareLen; i++ {
		if textRunes[i] == summaryRunes[i] {
			matchCount++
		}
	}

	// 匹配率超过 80% 就认为匹配
	matchRate := matchCount * 100 / compareLen
	return matchRate >= 80
}

// cutSummaryFromParagraph 从正文中切除摘要文本
func cutSummaryFromParagraph(contentMD, summary string, startIdx int, paragraphs []string) (string, bool) {
	paragraph := strings.TrimSpace(paragraphs[startIdx])
	plainText := stripMarkdownInline(paragraph)

	summaryRunes := []rune(summary)
	plainRunes := []rune(plainText)

	// 找到摘要的结束位置
	cutPos := 0
	summaryIdx := 0
	plainIdx := 0

	for summaryIdx < len(summaryRunes) && plainIdx < len(plainRunes) {
		if summaryRunes[summaryIdx] == plainRunes[plainIdx] {
			summaryIdx++
			plainIdx++
			cutPos = plainIdx
		} else {
			// 跳过不匹配的字符（可能是Markdown格式符号或空白）
			plainIdx++
		}
	}

	if cutPos == 0 {
		return contentMD, false
	}

	// 在原始段落中找到对应的位置（因为原始段落有 Markdown 格式）
	// 方法：在原始段落中搜索纯文本的对应位置
	remaining := string(plainRunes[cutPos:])
	remaining = strings.TrimSpace(remaining)

	if remaining == "" {
		// 整个第一段就是摘要，检查后面是否还有内容
		hasMoreContent := false
		for i := startIdx + 1; i < len(paragraphs); i++ {
			if strings.TrimSpace(paragraphs[i]) != "" {
				hasMoreContent = true
				break
			}
		}
		if !hasMoreContent {
			// 后面没有内容了，不能删除（否则全文为空）
			return contentMD, false
		}
		paragraphs[startIdx] = ""
	} else {
		// 在原始段落中找到剩余文本的位置
		origRunes := []rune(paragraph)
		// 从后往前搜索剩余文本的开始位置
		found := false
		for i := 0; i <= len(origRunes)-len([]rune(remaining)); i++ {
			if string(origRunes[i:i+len([]rune(remaining))]) == remaining {
				paragraphs[startIdx] = strings.TrimSpace(string(origRunes[i:]))
				found = true
				break
			}
		}
		if !found {
			// 如果找不到精确匹配，尝试模糊匹配：保留段落的后半部分
			cutRunePos := len(origRunes) * cutPos / len(plainRunes)
			if cutRunePos > 0 && cutRunePos < len(origRunes) {
				paragraphs[startIdx] = strings.TrimSpace(string(origRunes[cutRunePos:]))
			} else {
				return contentMD, false
			}
		}
	}

	// 重建正文
	var result []string
	for _, p := range paragraphs {
		trimmed := strings.TrimSpace(p)
		if trimmed == "" && len(result) > 0 && strings.TrimSpace(result[len(result)-1]) == "" {
			continue // 避免连续空行
		}
		result = append(result, p)
	}

	// 清理开头和结尾的空行
	for len(result) > 0 && strings.TrimSpace(result[0]) == "" {
		result = result[1:]
	}
	for len(result) > 0 && strings.TrimSpace(result[len(result)-1]) == "" {
		result = result[:len(result)-1]
	}

	return strings.Join(result, "\n\n"), true
}

// stripMarkdownInline 去除行内 Markdown 格式，保留纯文本
func stripMarkdownInline(text string) string {
	// 去除 **bold** 和 *italic*
	text = removeBoldItalic(text)
	// 去除 `code`
	text = removeInlineCode(text)
	// 去除 [link](url)
	text = removeLinks(text)
	// 去除 ![alt](url)
	text = removeImages(text)
	// 去除 HTML 标签
	text = removeHTMLTags(text)
	// 压缩空白
	text = strings.TrimSpace(text)
	return text
}

func removeBoldItalic(text string) string {
	// **text**
	for {
		start := strings.Index(text, "**")
		if start == -1 {
			break
		}
		end := strings.Index(text[start+2:], "**")
		if end == -1 {
			break
		}
		text = text[:start] + text[start+2:start+2+end] + text[start+2+end+2:]
	}
	// *text* (但不匹配 **)
	for {
		start := strings.Index(text, "*")
		if start == -1 {
			break
		}
		// 确保不是 **
		if start+1 < len(text) && text[start+1] == '*' {
			break
		}
		end := strings.Index(text[start+1:], "*")
		if end == -1 {
			break
		}
		text = text[:start] + text[start+1:start+1+end] + text[start+1+end+1:]
	}
	return text
}

func removeInlineCode(text string) string {
	for {
		start := strings.Index(text, "`")
		if start == -1 {
			break
		}
		end := strings.Index(text[start+1:], "`")
		if end == -1 {
			break
		}
		text = text[:start] + text[start+1:start+1+end] + text[start+1+end+1:]
	}
	return text
}

func removeLinks(text string) string {
	// [text](url)
	for {
		start := strings.Index(text, "[")
		if start == -1 {
			break
		}
		end := strings.Index(text[start:], "](")
		if end == -1 {
			break
		}
		end = start + end
		closeParen := strings.Index(text[end+2:], ")")
		if closeParen == -1 {
			break
		}
		// 保留链接文本，去掉链接URL
		linkText := text[start+1 : end]
		text = text[:start] + linkText + text[end+2+closeParen+1:]
	}
	return text
}

func removeImages(text string) string {
	// ![alt](url)
	for {
		start := strings.Index(text, "![")
		if start == -1 {
			break
		}
		closeParen := strings.Index(text[start+2:], ")")
		if closeParen == -1 {
			break
		}
		text = text[:start] + text[start+2+closeParen+1:]
	}
	return text
}

func removeHTMLTags(text string) string {
	var result strings.Builder
	inTag := false
	for _, r := range text {
		if r == '<' {
			inTag = true
			continue
		}
		if r == '>' {
			inTag = false
			continue
		}
		if !inTag {
			result.WriteRune(r)
		}
	}
	return result.String()
}

func markdownToHTML(md string) string {
	extensions := parser.CommonExtensions | parser.AutoHeadingIDs | parser.Tables
	p := parser.NewWithExtensions(extensions)
	doc := p.Parse([]byte(md))
	htmlFlags := html.CommonFlags | html.HrefTargetBlank
	renderer := html.NewRenderer(html.RendererOptions{Flags: htmlFlags})
	return string(markdown.Render(doc, renderer))
}
