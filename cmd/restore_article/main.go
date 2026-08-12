package main

import (
	"fmt"
	"log"

	"github.com/charios-123/luna-blog/config"
	"github.com/charios-123/luna-blog/internal/biz"
	"github.com/charios-123/luna-blog/internal/model/po"
	mdutils "github.com/charios-123/luna-blog/pkg/markdown"

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

	var article po.Article
	if err := config.DB.Where("id = ?", 3267).First(&article).Error; err != nil {
		log.Fatalf("查询文章失败: %v", err)
	}

	fmt.Printf("文章 ID=%d, 标题=%s\n", article.ID, article.Title)
	sourceURL := ""
	if article.SourceURL != nil {
		sourceURL = *article.SourceURL
	}
	fmt.Printf("SourceURL=%s\n", sourceURL)

	if sourceURL == "" {
		fmt.Println("没有 source_url，无法重新爬取")
		return
	}

	// 重新爬取
	crawler := biz.NewCSDNCrawler()
	md, err := crawler.FetchArticlePage(sourceURL)
	if err != nil {
		log.Fatalf("爬取失败: %v", err)
	}

	fmt.Printf("爬取到 Markdown 长度=%d\n", len(md))

	// 格式化分段
	md = mdutils.FormatMarkdownParagraphs(md)
	md = mdutils.CleanExtraWhitespace(md)

	// 生成 HTML
	htmlContent := mdToHTML(md)

	// 更新数据库
	if err := config.DB.Model(&article).Updates(map[string]interface{}{
		"content_markdown": md,
		"content_html":     htmlContent,
	}).Error; err != nil {
		log.Fatalf("更新失败: %v", err)
	}

	fmt.Printf("恢复成功！Markdown=%d字符, HTML=%d字符\n", len(md), len(htmlContent))

	// 同时检查是否还有其他被清空的文章
	var emptyArticles []po.Article
	config.DB.Where("status = 1 AND (content_markdown = '' OR content_markdown IS NULL)").Find(&emptyArticles)
	if len(emptyArticles) > 0 {
		fmt.Printf("\n警告：还有 %d 篇文章内容为空:\n", len(emptyArticles))
		for _, a := range emptyArticles {
			fmt.Printf("  ID=%d, 标题=%s\n", a.ID, a.Title)
		}
	}
}

func mdToHTML(md string) string {
	extensions := parser.CommonExtensions | parser.AutoHeadingIDs | parser.Tables
	p := parser.NewWithExtensions(extensions)
	doc := p.Parse([]byte(md))
	htmlFlags := html.CommonFlags | html.HrefTargetBlank
	renderer := html.NewRenderer(html.RendererOptions{Flags: htmlFlags})
	return string(markdown.Render(doc, renderer))
}
