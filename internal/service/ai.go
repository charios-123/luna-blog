package service

import (
	"encoding/json"

	"github.com/charios-123/luna-blog/internal/biz"
	"github.com/charios-123/luna-blog/internal/model/dto"
	"github.com/charios-123/luna-blog/pkg/response"
	"github.com/gin-gonic/gin"
)

// AIService AI 能力服务
type AIService struct {
	aiUseCase biz.AIUseCase
}

// NewAIService 创建 AI 服务
func NewAIService(aiUseCase biz.AIUseCase) *AIService {
	return &AIService{aiUseCase: aiUseCase}
}

// ChatAboutArticleStream 基于文章内容进行 AI 问答（SSE 流式）
// @Summary 文章 AI 问答（SSE 流式）
// @Description 基于当前文章内容回答读者提问,以 SSE 流式返回,支持前端打字机效果
// @Tags 博客前台
// @Accept json
// @Produce text/event-stream
// @Param id path int true "文章ID"
// @Param request body dto.AIChatRequest true "对话消息列表"
// @Success 200 {string} string "SSE 事件流"
// @Failure 400 {object} response.Response "请求参数错误"
// @Router /blog/articles/{id}/ai/chat [post]
func (s *AIService) ChatAboutArticleStream(c *gin.Context) {
	var idReq dto.IDRequest
	if err := c.ShouldBindUri(&idReq); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	var req dto.AIChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}
	// 校验:必须有至少一条用户消息
	if len(req.Messages) == 0 {
		response.BadRequest(c, "请先输入提问内容")
		return
	}
	last := req.Messages[len(req.Messages)-1]
	if last.Role != "user" || last.Content == "" {
		response.BadRequest(c, "请先输入提问内容")
		return
	}

	// SSE 响应头
	c.Header("Content-Type", "text/event-stream; charset=utf-8")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // 禁用 nginx 等代理缓冲,保证实时

	// writeEvent 推送一个 SSE 事件并立即刷新(WriteString 返回真实写入错误,可感知客户端断开)
	writeEvent := func(ev map[string]any) error {
		b, err := json.Marshal(ev)
		if err != nil {
			return err
		}
		if _, err := c.Writer.WriteString("event: message\ndata: " + string(b) + "\n\n"); err != nil {
			return err
		}
		c.Writer.Flush()
		return nil
	}

	writeEvent(map[string]any{"type": "start"})

	err := s.aiUseCase.ChatAboutArticleStream(c.Request.Context(), idReq.ID, req.Messages,
		func(chunk string) error {
			return writeEvent(map[string]any{"type": "content", "content": chunk})
		})
	if err != nil {
		writeEvent(map[string]any{"type": "error", "message": err.Error()})
	}
	writeEvent(map[string]any{"type": "done"})
}
