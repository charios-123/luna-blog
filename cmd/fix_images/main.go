package main

import (
	"fmt"
	"log"

	"github.com/ydcloud-dy/leaf-api/config"
	"github.com/ydcloud-dy/leaf-api/internal/model/po"
	mdutils "github.com/ydcloud-dy/leaf-api/pkg/markdown"
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

	// 创建图片处理器
	processor := mdutils.NewImageProcessor("uploads", "")

	// 查询所有文章
	var articles []po.Article
	if err := config.DB.Find(&articles).Error; err != nil {
		log.Fatalf("查询文章失败: %v", err)
	}

	fmt.Printf("找到 %d 篇文章，开始处理...\n\n", len(articles))

	successCount := 0
	failCount := 0
	skipCount := 0

	// 处理每篇文章
	for i, article := range articles {
		fmt.Printf("[%d/%d] 处理文章 ID=%d, 标题=%s\n", i+1, len(articles), article.ID, article.Title)

		// 检查是否包含语雀图片
		if !containsYuqueImage(article.ContentMarkdown) {
			fmt.Println("  ✓ 跳过：不包含语雀图片")
			skipCount++
			continue
		}

		// 处理 Markdown 中的图片
		processedMarkdown, err := processor.ProcessMarkdownImages(article.ContentMarkdown)
		if err != nil {
			fmt.Printf("  ✗ 处理失败: %v\n", err)
			failCount++
			continue
		}

		// 检查是否有变化
		if processedMarkdown == article.ContentMarkdown {
			fmt.Println("  ✓ 跳过：图片未变化")
			skipCount++
			continue
		}

		// 更新数据库
		if err := config.DB.Model(&article).Updates(map[string]interface{}{
			"content_markdown": processedMarkdown,
		}).Error; err != nil {
			fmt.Printf("  ✗ 更新数据库失败: %v\n", err)
			failCount++
			continue
		}

		fmt.Println("  ✓ 处理成功")
		successCount++
	}

	// 输出统计信息
	fmt.Printf("\n处理完成！\n")
	fmt.Printf("总计: %d 篇文章\n", len(articles))
	fmt.Printf("成功: %d 篇\n", successCount)
	fmt.Printf("跳过: %d 篇\n", skipCount)
	fmt.Printf("失败: %d 篇\n", failCount)
}

// containsYuqueImage 检查 Markdown 是否包含语雀图片
func containsYuqueImage(markdown string) bool {
	return len(markdown) > 0 && (
		contains(markdown, "cdn.nlark.com") ||
		contains(markdown, "yuque.com"))
}

// contains 简单的字符串包含检查
func contains(s, substr string) bool {
	return len(s) >= len(substr) && findSubstring(s, substr)
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
