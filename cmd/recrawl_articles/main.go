package main

import (
	"fmt"
	"log"
	"time"

	"github.com/ydcloud-dy/leaf-api/config"
	"github.com/ydcloud-dy/leaf-api/internal/biz"
	"github.com/ydcloud-dy/leaf-api/internal/model/po"
	"github.com/ydcloud-dy/leaf-api/pkg/logger"
	mdutils "github.com/ydcloud-dy/leaf-api/pkg/markdown"
)

// 需要重新爬取的文章ID列表
var articleIDs = []uint{62, 76, 88, 96, 99, 102, 126, 131, 134, 146, 157, 161, 164, 165}

func main() {
	// 加载配置
	if err := config.LoadConfig("config.yaml"); err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 初始化日志
	logger.Init()

	// 初始化数据库
	if err := config.InitDatabase(); err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}

	// 创建 CSDN 爬虫
	crawler := biz.NewCSDNCrawler()

	// 创建图片处理器
	processor := mdutils.NewImageProcessor("uploads", "")

	// 查询需要重新爬取的文章
	var articles []po.Article
	if err := config.DB.Where("id IN ?", articleIDs).Find(&articles).Error; err != nil {
		log.Fatalf("查询文章失败: %v", err)
	}

	fmt.Printf("找到 %d 篇需要重新爬取的文章\n\n", len(articles))

	successCount := 0
	failCount := 0

	for i, article := range articles {
		fmt.Printf("[%d/%d] 重新爬取文章 ID=%d, 标题=%s\n", i+1, len(articles), article.ID, article.Title)
		fmt.Printf("  源URL: %s\n", article.SourceURL)

		if article.SourceURL == "" {
			fmt.Println("  ✗ 跳过：没有源URL")
			failCount++
			continue
		}

		// 爬取文章内容
		content, err := crawler.FetchArticlePage(article.SourceURL)
		if err != nil {
			fmt.Printf("  ✗ 爬取失败: %v\n", err)
			failCount++
			continue
		}

		fmt.Printf("  ✓ 爬取成功,内容长度: %d\n", len(content))

		// 处理图片(下载到本地)
		processedContent, err := processor.ProcessMarkdownImages(content)
		if err != nil {
			fmt.Printf("  ⚠ 图片处理失败,使用原始内容: %v\n", err)
			processedContent = content
		} else {
			fmt.Printf("  ✓ 图片处理完成\n")
		}

		// 更新数据库
		if err := config.DB.Model(&article).Updates(map[string]interface{}{
			"content_markdown": processedContent,
		}).Error; err != nil {
			fmt.Printf("  ✗ 更新数据库失败: %v\n", err)
			failCount++
			continue
		}

		fmt.Println("  ✓ 更新成功")
		successCount++

		// 间隔一段时间,避免请求过快
		time.Sleep(2 * time.Second)
	}

	fmt.Printf("\n重新爬取完成！\n")
	fmt.Printf("总计: %d 篇文章\n", len(articles))
	fmt.Printf("成功: %d 篇\n", successCount)
	fmt.Printf("失败: %d 篇\n", failCount)
}
