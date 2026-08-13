package biz

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/charios-123/luna-blog/config"
	"github.com/charios-123/luna-blog/internal/data"
	"github.com/charios-123/luna-blog/internal/model/dto"
	"github.com/charios-123/luna-blog/pkg/logger"
)

// AIUseCase AI 能力接口
type AIUseCase interface {
	// ChatAboutArticleStream 基于文章内容进行 AI 问答（SSE 流式）
	// 将文章标题/摘要/正文片段作为上下文,结合用户消息调用大模型,
	// 生成的回复按增量片段通过 emit 回调逐段返回,支持前端打字机效果
	ChatAboutArticleStream(ctx context.Context, articleID uint, messages []dto.AIChatMessage, emit func(chunk string) error) error
}

// aiUseCase AI 业务实现(DeepSeek OpenAI 兼容接口)
type aiUseCase struct {
	data *data.Data
	cfg  config.AIConfig
	http *http.Client
}

// NewAIUseCase 创建 AI 业务实例
func NewAIUseCase(d *data.Data) AIUseCase {
	cfg := config.AppConfig.AI
	if cfg.Timeout <= 0 {
		cfg.Timeout = 60
	}
	return &aiUseCase{
		data: d,
		cfg:  cfg,
		// 流式响应不设总超时(总超时会在流式读取中途截断),
		// 改用请求上下文 + 方法内的流式超时兜底
		http: &http.Client{},
	}
}

// dashScopeChatRequest 通义千问 OpenAI 兼容请求体
type dashScopeChatRequest struct {
	Model    string             `json:"model"`
	Messages []dashScopeMessage `json:"messages"`
	Stream   bool               `json:"stream,omitempty"`
}

type dashScopeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// buildSystemMessages 读取文章并组装 system 提示词 + 用户历史对话
func (uc *aiUseCase) buildSystemMessages(articleID uint, messages []dto.AIChatMessage) ([]dashScopeMessage, error) {
	if strings.TrimSpace(uc.cfg.APIKey) == "" {
		return nil, errors.New("AI 功能未配置:请设置环境变量 AI_API_KEY(DeepSeek/OpenAI 兼容 API Key)")
	}

	// 读取文章
	article, err := uc.data.ArticleRepo.FindByIDWithRelations(articleID)
	if err != nil {
		return nil, errors.New("文章不存在")
	}
	if article.Status != 1 { // 仅已发布文章可使用 AI 问答
		return nil, errors.New("文章未发布,暂不支持 AI 问答")
	}

	// 组装上下文(限制正文长度,防止超上下文/浪费 token)
	maxChars := uc.cfg.MaxContentChars
	if maxChars <= 0 {
		maxChars = 8000
	}
	content := stripMarkdownForAI(article.ContentMarkdown)
	runes := []rune(content)
	if len(runes) > maxChars {
		content = string(runes[:maxChars]) + "...(正文过长已截断)"
	}
	if strings.TrimSpace(content) == "" {
		content = "(本文暂无正文)"
	}

	systemPrompt := fmt.Sprintf(
		"你是一名博客文章问答助手。请只根据下面提供的文章内容回答读者的提问。\n"+
			"如果问题与文章无关或文章中没有相关信息,请诚实说明。回答使用简体中文,简洁清晰。\n\n"+
			"=== 文章标题 ===\n%s\n\n=== 文章摘要 ===\n%s\n\n=== 文章正文 ===\n%s",
		article.Title, article.Summary, content,
	)

	// 构建请求消息:系统提示 + 用户历史对话
	reqMessages := make([]dashScopeMessage, 0, len(messages)+1)
	reqMessages = append(reqMessages, dashScopeMessage{Role: "system", Content: systemPrompt})
	// 只透传最近 10 条对话,避免上下文过长
	start := 0
	if len(messages) > 10 {
		start = len(messages) - 10
	}
	for _, m := range messages[start:] {
		role := m.Role
		if role != "user" && role != "assistant" {
			continue
		}
		reqMessages = append(reqMessages, dashScopeMessage{Role: role, Content: m.Content})
	}

	return reqMessages, nil
}

// ChatAboutArticleStream 基于文章内容回答用户问题(SSE 流式)
func (uc *aiUseCase) ChatAboutArticleStream(ctx context.Context, articleID uint, messages []dto.AIChatMessage, emit func(chunk string) error) error {
	reqMessages, err := uc.buildSystemMessages(articleID, messages)
	if err != nil {
		return err
	}

	body, err := json.Marshal(dashScopeChatRequest{
		Model:    uc.cfg.Model,
		Messages: reqMessages,
		Stream:   true,
	})
	if err != nil {
		return fmt.Errorf("构造请求失败: %w", err)
	}

	// 流式超时兜底(防止模型连接挂起),同时保留上层 ctx 取消(客户端断开即中断)
	streamTimeout := 2 * time.Duration(uc.cfg.Timeout) * time.Second
	if streamTimeout <= 0 {
		streamTimeout = 120 * time.Second
	}
	ctx, cancel := context.WithTimeout(ctx, streamTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(uc.cfg.BaseURL, "/")+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("构造请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+uc.cfg.APIKey)

	resp, err := uc.http.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return errors.New("AI 服务响应超时,请重试")
		}
		logger.Warn("AI 请求失败: ", err)
		return errors.New("AI 服务请求失败,请稍后再试")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// 读取错误详情
		var e struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&e)
		msg := e.Error.Message
		if msg == "" {
			msg = fmt.Sprintf("AI 接口返回异常(status=%d)", resp.StatusCode)
		}
		logger.Warn(fmt.Sprintf("AI 接口返回异常: status=%d body=%s", resp.StatusCode, msg))
		return errors.New("AI 服务暂时不可用,请稍后再试")
	}

	// 逐行解析 SSE 流,将内容增量片段通过 emit 回调输出
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024) // 防止超长行被截断
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "" {
			continue
		}
		if data == "[DONE]" {
			break
		}

		var ev struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if err := json.Unmarshal([]byte(data), &ev); err != nil {
			continue // 跳过无法解析的心跳/元数据帧
		}
		if len(ev.Choices) == 0 || ev.Choices[0].Delta.Content == "" {
			continue
		}

		// 输出增量片段;emit 返回错误说明客户端已断开,终止流式读取
		if err := emit(ev.Choices[0].Delta.Content); err != nil {
			return nil
		}
	}

	if err := scanner.Err(); err != nil && ctx.Err() == nil {
		return errors.New("读取 AI 响应失败")
	}
	return nil
}

// stripMarkdownForAI 简单去除 Markdown 标记,降低 token 消耗
func stripMarkdownForAI(md string) string {
	if md == "" {
		return ""
	}
	// 去掉代码块围栏标记,保留代码内容
	md = strings.ReplaceAll(md, "```", " ")
	// 去掉行内代码反引号
	md = strings.ReplaceAll(md, "`", "")
	// 去掉图片与链接
	md = regexpReplace(`!\[[^\]]*\]\([^)]*\)`, md, "")
	md = regexpReplace(`\[([^\]]+)\]\([^)]*\)`, md, "$1")
	// 去掉粗体/斜体/删除线符号
	md = regexpReplace(`\*\*([^*]+)\*\*`, md, "$1")
	md = regexpReplace(`__([^_]+)__`, md, "$1")
	md = strings.ReplaceAll(md, "**", "")
	md = strings.ReplaceAll(md, "~~", "")
	// 标题符号
	md = regexpReplace(`^#{1,6}\s+`, md, "")
	return strings.TrimSpace(md)
}

// regexpReplace 使用正则替换(每次编译一次,量小可接受)
func regexpReplace(pattern, src, repl string) string {
	re, err := regexp.Compile(pattern)
	if err != nil {
		return src
	}
	return re.ReplaceAllString(src, repl)
}
