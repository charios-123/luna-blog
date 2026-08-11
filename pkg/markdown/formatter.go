package markdown

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

// 逻辑分段点正则表达式
// 匹配中文编号(一、二、)、阿拉伯数字编号(1. 2.)、括号编号((1) (2))等
var logicalSplitPatterns = []*regexp.Regexp{
	// 中文数字编号: 一、 二、 三、 ... 十、 十一、 等（前面需要有内容或句号）
	regexp.MustCompile(`([。！？；\n])\s*([一二三四五六七八九十]+、)`),
	// 阿拉伯数字编号: 1. 2. 3. （前面需要有句号或换行，避免误匹配小数）
	regexp.MustCompile(`([。！？；\n])\s*(\d+[\.\s])`),
	// 括号编号: (1) (2) 或 （1）（2）
	regexp.MustCompile(`([。！？；\n])\s*([\(（]\d+[\)）])`),
	// "第X章""第X节" 等
	regexp.MustCompile(`([。！？；\n])\s*(第[一二三四五六七八九十百千\d]+[章节部分])`),
	// 步骤标识: "第一步""第二步" 等
	regexp.MustCompile(`([。！？；\n])\s*(第[一二三四五六七八九十]+步)`),
}

// FormatMarkdownParagraphs 重新格式化 Markdown 内容，将长文本拆分为适当的段落
// 策略: 先按逻辑分段点(编号、章节标题等)拆分，再对过长段落按句子结束符拆分
func FormatMarkdownParagraphs(content string) string {
	if strings.TrimSpace(content) == "" {
		return content
	}

	// 第一步: 按逻辑分段点拆分
	content = splitByLogicalPoints(content)

	// 第二步: 按行处理，累积文本并在适当位置分段
	lines := strings.Split(content, "\n")
	var result []string
	var currentParagraph strings.Builder
	currentLength := 0

	for _, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		// 空行 - 保存当前段落并开始新段落
		if trimmedLine == "" {
			if currentParagraph.Len() > 0 {
				result = append(result, splitLongText(currentParagraph.String(), 300)...)
				currentParagraph.Reset()
				currentLength = 0
			}
			continue
		}

		// Markdown 格式行直接输出
		if isMarkdownFormatLine(trimmedLine) {
			// 先输出之前累积的段落
			if currentParagraph.Len() > 0 {
				result = append(result, splitLongText(currentParagraph.String(), 300)...)
				currentParagraph.Reset()
				currentLength = 0
			}
			result = append(result, trimmedLine)
			continue
		}

		// 普通文本行，累加到当前段落
		lineLength := utf8.RuneCountInString(trimmedLine)
		if currentLength+lineLength > 300 && currentParagraph.Len() > 0 {
			// 当前段落已达到阈值，保存并开始新段落
			result = append(result, splitLongText(currentParagraph.String(), 300)...)
			currentParagraph.Reset()
			currentLength = 0
		}

		if currentParagraph.Len() > 0 {
			currentParagraph.WriteString(" ")
			currentLength++
		}
		currentParagraph.WriteString(trimmedLine)
		currentLength += lineLength
	}

	// 输出最后一个段落
	if currentParagraph.Len() > 0 {
		result = append(result, splitLongText(currentParagraph.String(), 300)...)
	}

	return strings.Join(result, "\n\n")
}

// splitByLogicalPoints 在逻辑分段点(编号、章节标题等)前插入段落分隔符
func splitByLogicalPoints(content string) string {
	for _, pattern := range logicalSplitPatterns {
		// 在匹配到的分段点前插入换行符
		// $1 是前面的句子结束符，$2 是编号/标题
		content = pattern.ReplaceAllString(content, "$1\n\n$2")
	}

	// 额外处理: 行首的编号模式（前面没有句子结束符的情况）
	// 例如一整行以 "一、" "1." "(1)" 开头，且上一行有内容
	lines := strings.Split(content, "\n")
	var result []string

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if i > 0 && trimmed != "" {
			// 检查当前行是否以逻辑编号开头
			if isLogicalNumberStart(trimmed) {
				// 上一行有内容且不是空行，在此处插入空行
				if len(result) > 0 && strings.TrimSpace(result[len(result)-1]) != "" {
					result = append(result, "")
				}
			}
		}
		result = append(result, line)
	}

	return strings.Join(result, "\n")
}

// isLogicalNumberStart 判断行首是否为逻辑编号
func isLogicalNumberStart(line string) bool {
	if line == "" {
		return false
	}

	// 中文数字编号: 一、 二、 三、
	chineseNumPattern := regexp.MustCompile(`^[一二三四五六七八九十]+、`)
	if chineseNumPattern.MatchString(line) {
		return true
	}

	// 阿拉伯数字编号: 1. 2. 3. （后面跟空格或文字，不是小数）
	arabicNumPattern := regexp.MustCompile(`^\d+\.\s`)
	if arabicNumPattern.MatchString(line) {
		return true
	}

	// 括号编号: (1) （1）
	parenNumPattern := regexp.MustCompile(`^[\(（]\d+[\)）]`)
	if parenNumPattern.MatchString(line) {
		return true
	}

	// "第X章""第X节"
	chapterPattern := regexp.MustCompile(`^第[一二三四五六七八九十百千\d]+[章节部分]`)
	if chapterPattern.MatchString(line) {
		return true
	}

	return false
}

// hasGoodParagraphs 检查内容是否已经有良好的段落分隔
func hasGoodParagraphs(content string) bool {
	// 统计段落分隔符数量
	paragraphBreaks := strings.Count(content, "\n\n")
	// 如果有两个以上的段落分隔符，认为已经有良好的段落结构
	return paragraphBreaks >= 2
}

// isMarkdownFormatLine 判断是否为 Markdown 格式行
func isMarkdownFormatLine(line string) bool {
	if line == "" {
		return false
	}
	trimmed := strings.TrimSpace(line)

	// 标题
	if strings.HasPrefix(trimmed, "#") {
		return true
	}
	// 列表
	if strings.HasPrefix(trimmed, "- ") || strings.HasPrefix(trimmed, "* ") {
		return true
	}
	// 有序列表
	if len(trimmed) > 2 && trimmed[0] >= '1' && trimmed[0] <= '9' && trimmed[1] == '.' && trimmed[2] == ' ' {
		return true
	}
	// 引用
	if strings.HasPrefix(trimmed, "> ") {
		return true
	}
	// 代码块
	if strings.HasPrefix(trimmed, "```") {
		return true
	}
	// 分隔线
	if strings.HasPrefix(trimmed, "---") {
		return true
	}
	// 图片
	if strings.HasPrefix(trimmed, "![") {
		return true
	}
	// 表格
	if strings.HasPrefix(trimmed, "|") {
		return true
	}

	return false
}

// splitLongText 将长文本按句子结束符拆分为多个段落
func splitLongText(text string, maxLen int) []string {
	runes := []rune(text)
	textLen := len(runes)

	// 如果文本已经足够短，直接返回
	if textLen <= maxLen {
		return []string{text}
	}

	var paragraphs []string
	currentStart := 0

	for i := maxLen; i < textLen; i += maxLen / 2 {
		// 尝试在句子结束符处分段
		splitAt := findSentenceEnd(runes, i, i+maxLen/2)
		if splitAt > currentStart && splitAt <= textLen {
			paragraph := strings.TrimSpace(string(runes[currentStart:splitAt]))
			if paragraph != "" {
				paragraphs = append(paragraphs, paragraph)
			}
			currentStart = splitAt
			i = currentStart + maxLen - 1
		}
	}

	// 添加剩余部分
	if currentStart < textLen {
		remaining := strings.TrimSpace(string(runes[currentStart:]))
		if remaining != "" {
			paragraphs = append(paragraphs, remaining)
		}
	}

	// 如果没有成功分段，返回原文
	if len(paragraphs) == 0 {
		paragraphs = append(paragraphs, text)
	}

	return paragraphs
}

// findSentenceEnd 在指定范围内查找句子结束符位置
func findSentenceEnd(runes []rune, start, end int) int {
	textLen := len(runes)
	if start >= textLen {
		return textLen
	}
	if end > textLen {
		end = textLen
	}

	// 先向前查找句子结束符
	for i := end - 1; i >= start; i-- {
		if isSentenceEnd(runes[i]) {
			return i + 1
		}
	}

	// 如果没找到，在附近查找逗号
	commaSearchStart := start - 30
	if commaSearchStart < 0 {
		commaSearchStart = 0
	}
	for i := end - 1; i >= commaSearchStart; i-- {
		if isSentencePause(runes[i]) {
			return i + 1
		}
	}

	// 实在找不到，直接在最大长度处分段
	return end
}

// isSentenceEnd 判断是否为句子结束符
func isSentenceEnd(r rune) bool {
	return r == '。' || r == '！' || r == '？' ||
		r == '!' || r == '?' || r == '；' ||
		r == ';' || r == '.'
}

// isSentencePause 判断是否为句间停顿符
func isSentencePause(r rune) bool {
	return r == '，' || r == ',' || r == '、' || r == ':' || r == '：'
}

// CleanExtraWhitespace 清理多余空白
func CleanExtraWhitespace(content string) string {
	// 移除行首行尾空白
	lines := strings.Split(content, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimRight(line, " \t")
	}
	content = strings.Join(lines, "\n")

	// 将多个连续空行替换为两个空行
	re := regexp.MustCompile(`\n{3,}`)
	content = re.ReplaceAllString(content, "\n\n")

	// 移除开头和结尾的空行
	content = strings.TrimSpace(content)

	return content
}
