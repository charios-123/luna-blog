package service

import (
	"time"

	"github.com/charios-123/luna-blog/internal/data"
	"github.com/charios-123/luna-blog/internal/model/po"
	"github.com/charios-123/luna-blog/pkg/response"
	"github.com/gin-gonic/gin"
)

// AnalyticsService 数据分析服务
type AnalyticsService struct {
	data *data.Data
}

// NewAnalyticsService 创建数据分析服务
func NewAnalyticsService(d *data.Data) *AnalyticsService {
	return &AnalyticsService{
		data: d,
	}
}

// Get7DaysVisits 获取近7天的访问量统计
// @Summary 获取近7天访问量
// @Description 获取近7天每天的访问量统计数据（PV和UV）
// @Tags 数据分析
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=object{dates=[]string,pv=[]int64,uv=[]int64,total_pv=int64,total_uv=int64}} "获取成功"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /analytics/visits/7days [get]
func (s *AnalyticsService) Get7DaysVisits(c *gin.Context) {
	now := time.Now()
	dates := make([]string, 7)
	pvData := make([]int64, 7)
	uvData := make([]int64, 7)

	var totalPV int64
	var totalUV int64

	// 计算近7天的数据
	for i := 6; i >= 0; i-- {
		date := now.AddDate(0, 0, -i)
		dateStr := date.Format("2006-01-02")
		dates[6-i] = dateStr

		// 当天开始和结束时间
		startTime := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
		endTime := startTime.Add(24 * time.Hour)

		// 统计 PV（页面访问量）
		var pv int64
		s.data.GetDB().Model(&po.PageVisit{}).
			Where("created_at >= ? AND created_at < ?", startTime, endTime).
			Count(&pv)
		pvData[6-i] = pv
		totalPV += pv

		// 统计 UV（独立访客数）- 按 IP 去重
		var uv int64
		s.data.GetDB().Model(&po.PageVisit{}).
			Select("COUNT(DISTINCT ip)").
			Where("created_at >= ? AND created_at < ?", startTime, endTime).
			Count(&uv)
		uvData[6-i] = uv
		totalUV += uv
	}

	response.Success(c, gin.H{
		"dates":    dates,
		"pv":       pvData,
		"uv":       uvData,
		"total_pv": totalPV,
		"total_uv": totalUV,
	})
}
