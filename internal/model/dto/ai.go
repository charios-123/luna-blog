package dto

// AIChatMessage AI 对话消息
type AIChatMessage struct {
	Role    string `json:"role"`    // user / assistant
	Content string `json:"content"`
}

// AIChatRequest AI 问答请求
type AIChatRequest struct {
	Messages []AIChatMessage `json:"messages"`
}
