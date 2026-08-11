package main

import (
	"database/sql"
	"fmt"
	"log"
	"regexp"
	"strings"

	_ "github.com/go-sql-driver/mysql"
)

// Article 文章结构
type Article struct {
	ID              int
	Title           string
	ContentMarkdown string
}

// fixIncorrectCodeBlocks 修复被错误包裹的代码块
// 如果代码块中包含 **text** (粗体标记),则认为是被错误包裹的,需要解开
func fixIncorrectCodeBlocks(content string) string {
	// 匹配代码块 ```...```
	// 需要处理代码块中包含 ** 的情况
	parts := strings.Split(content, "```")

	var result strings.Builder
	for i, part := range parts {
		if i%2 == 1 {
			// 这是代码块内容
			// 检查是否包含 **text** 模式(粗体标记)
			// 如果包含,说明是被错误包裹的,需要解开
			boldRegex := regexp.MustCompile(`\*\*[^*\s][^*]*\*\*`)
			if boldRegex.MatchString(part) && !strings.Contains(part, "/**") {
				// 这是被错误包裹的代码块,解开它
				// 去掉首尾换行
				part = strings.Trim(part, "\n\r")
				result.WriteString("\n\n")
				result.WriteString(part)
				result.WriteString("\n\n")
			} else {
				// 正常的代码块,保留
				result.WriteString("```")
				result.WriteString(part)
				result.WriteString("```")
			}
		} else {
			// 非代码块部分
			result.WriteString(part)
		}
	}

	return result.String()
}

// fixBoldCommentMarkers 修复 /** */ 注释中的 ** 标记
// 将代码块外的 /** 替换为 /*,避免 ** 被误解析为 Markdown 粗体
func fixBoldCommentMarkers(content string) string {
	parts := strings.Split(content, "```")

	var result strings.Builder
	for i, part := range parts {
		if i%2 == 0 {
			// 非代码块部分: 将 /** 替换为 /*
			part = strings.ReplaceAll(part, "/**", "/*")
		}
		result.WriteString(part)
		if i < len(parts)-1 {
			result.WriteString("```")
		}
	}

	return result.String()
}

func main() {
	// 连接数据库
	db, err := sql.Open("mysql", "root:123456@tcp(127.0.0.1:3306)/leaf_admin?charset=utf8mb4&parseTime=true")
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}
	defer db.Close()

	// 查询所有可能受影响的文章(之前修复过的14篇 + 有 /** 的文章)
	rows, err := db.Query(`
		SELECT id, title, content_markdown
		FROM articles
		WHERE deleted_at IS NULL
		AND (content_markdown LIKE '%/**%' OR id IN (62, 76, 88, 96, 99, 102, 126, 131, 134, 146, 157, 161, 164, 165))
	`)
	if err != nil {
		log.Fatalf("查询失败: %v", err)
	}
	defer rows.Close()

	var articles []Article
	for rows.Next() {
		var a Article
		if err := rows.Scan(&a.ID, &a.Title, &a.ContentMarkdown); err != nil {
			log.Printf("扫描文章失败: %v", err)
			continue
		}
		articles = append(articles, a)
	}

	fmt.Printf("找到 %d 篇需要检查的文章\n", len(articles))

	fixedCount := 0
	for _, a := range articles {
		original := a.ContentMarkdown

		// 步骤1: 解开被错误包裹的代码块(包含 **bold** 的代码块)
		fixed := fixIncorrectCodeBlocks(original)

		// 步骤2: 修复 /** */ 注释中的 ** 标记
		fixed = fixBoldCommentMarkers(fixed)

		if fixed != original {
			// 更新数据库
			_, err := db.Exec("UPDATE articles SET content_markdown = ? WHERE id = ?", fixed, a.ID)
			if err != nil {
				log.Printf("更新文章 %d 失败: %v", a.ID, err)
				continue
			}
			fixedCount++
			fmt.Printf("已修复文章 %d: %s\n", a.ID, a.Title)
		}
	}

	fmt.Printf("\n总共修复了 %d 篇文章\n", fixedCount)
}
