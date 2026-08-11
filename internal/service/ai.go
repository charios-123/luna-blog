package service

import (
	"github.com/gin-gonic/gin"
	"github.com/ydcloud-dy/leaf-api/internal/biz"
	"github.com/ydcloud-dy/leaf-api/internal/model/dto"
	"github.com/ydcloud-dy/leaf-api/pkg/response"
)

// AIService AI 能力服务
type AIService struct {
	aiUseCase biz.AIUseCase
}

// NewAIService 创建 AI 服务
func NewAIService(aiUseCase biz.AIUseCase) *AIService {
	return &AIService{aiUseCase: aiUseCase}
}

// ChatAboutArticle 基于文章内容进行 AI 问答
// @Summary 文章 AI 问答
// @Description 基于当前文章内容回答读者提问
// @Tags 博客前台
// @Accept json
// @Produce json
// @Param id path int true "文章ID"
// @Param request body dto.AIChatRequest true "对话消息列表"
// @Success 200 {object} response.Response "获取成功"
// @Failure 400 {object} response.Response "请求参数错误"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /blog/articles/{id}/ai/chat [post]
func (s *AIService) ChatAboutArticle(c *gin.Context) {
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

	reply, err := s.aiUseCase.ChatAboutArticle(idReq.ID, req.Messages)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, gin.H{"reply": reply})
}
