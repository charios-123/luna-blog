package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ydcloud-dy/leaf-api/internal/data"
	"github.com/ydcloud-dy/leaf-api/internal/model/po"
	"github.com/ydcloud-dy/leaf-api/pkg/redis"
	"github.com/ydcloud-dy/leaf-api/pkg/response"
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

// GetOnlineUsers 获取当前在线用户详情
// @Summary 获取在线用户详情
// @Description 获取当前在线的用户列表，包括用户ID、用户名、IP、最后活跃时间等详细信息
// @Tags 数据分析
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=object{total=int,users=[]object,guests=[]object}} "获取成功"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /analytics/online/users [get]
func (s *AnalyticsService) GetOnlineUsers(c *gin.Context) {
	// 获取所有在线用户的键
	userKeys, err := redis.Keys(onlineUserPrefix + "*")
	if err != nil {
		response.ServerError(c, "获取在线用户失败")
		return
	}

	// 获取所有在线游客的键
	guestKeys, err := redis.Keys(onlineGuestPrefix + "*")
	if err != nil {
		response.ServerError(c, "获取在线游客失败")
		return
	}

	// 在线用户详情列表
	type OnlineUser struct {
		UserID         uint      `json:"user_id"`
		Username       string    `json:"username"`
		Nickname       string    `json:"nickname"`
		Avatar         string    `json:"avatar"`
		IP             string    `json:"ip"`
		CurrentPage    string    `json:"current_page"`    // 当前访问的页面
		UserAgent      string    `json:"user_agent"`      // 浏览器信息
		LastActiveAt   time.Time `json:"last_active_at"`
		OnlineDuration int64     `json:"online_duration"` // 在线时长（秒）
	}

	// 在线游客详情列表
	type OnlineGuest struct {
		IP           string    `json:"ip"`
		CurrentPage  string    `json:"current_page"`  // 当前访问的页面
		UserAgent    string    `json:"user_agent"`    // 浏览器信息
		LastActiveAt time.Time `json:"last_active_at"`
		Location     string    `json:"location,omitempty"` // IP地理位置（可选）
	}

	users := make([]OnlineUser, 0)
	guests := make([]OnlineGuest, 0)

	client := redis.GetClient()
	ctx := redis.GetContext()

	// 处理在线用户
	for _, key := range userKeys {
		// 提取用户ID
		userIDStr := strings.TrimPrefix(key, onlineUserPrefix)
		var userID uint
		fmt.Sscanf(userIDStr, "%d", &userID)

		// 从 Redis Hash 获取详细信息
		data, err := client.HGetAll(ctx, key).Result()
		if err != nil || len(data) == 0 {
			continue
		}

		// 解析时间戳
		var lastActiveTimestamp int64
		if ts, ok := data["last_active_at"]; ok {
			fmt.Sscanf(ts, "%d", &lastActiveTimestamp)
		}
		lastActiveAt := time.Unix(lastActiveTimestamp, 0)

		// 从数据库获取用户详情
		var user po.User
		if err := s.data.GetDB().First(&user, userID).Error; err != nil {
			continue
		}

		// 计算在线时长
		onlineDuration := time.Since(lastActiveAt).Seconds()
		if onlineDuration < 0 {
			onlineDuration = 0
		}

		users = append(users, OnlineUser{
			UserID:         user.ID,
			Username:       user.Username,
			Nickname:       user.Nickname,
			Avatar:         user.Avatar,
			IP:             data["ip"],
			CurrentPage:    data["path"],
			UserAgent:      data["user_agent"],
			LastActiveAt:   lastActiveAt,
			OnlineDuration: int64(onlineDuration),
		})
	}

	// 处理在线游客
	for _, key := range guestKeys {
		// 提取IP
		ip := strings.TrimPrefix(key, onlineGuestPrefix)

		// 从 Redis Hash 获取详细信息
		data, err := client.HGetAll(ctx, key).Result()
		if err != nil || len(data) == 0 {
			continue
		}

		// 解析时间戳
		var lastActiveTimestamp int64
		if ts, ok := data["last_active_at"]; ok {
			fmt.Sscanf(ts, "%d", &lastActiveTimestamp)
		}
		lastActiveAt := time.Unix(lastActiveTimestamp, 0)

		guests = append(guests, OnlineGuest{
			IP:           ip,
			CurrentPage:  data["path"],
			UserAgent:    data["user_agent"],
			LastActiveAt: lastActiveAt,
			Location:     s.getIPLocation(ip), // 获取IP地理位置
		})
	}

	response.Success(c, gin.H{
		"total": len(users) + len(guests),
		"users": users,
		"guests": guests,
		"summary": gin.H{
			"registered_users": len(users),
			"guest_users":      len(guests),
		},
	})
}

// GetOnlineStats 获取在线统计概览
// @Summary 获取在线统计概览
// @Description 获取当前在线人数统计，包括注册用户和游客数量
// @Tags 数据分析
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=object{total=int,users=int,guests=int}} "获取成功"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /analytics/online/stats [get]
func (s *AnalyticsService) GetOnlineStats(c *gin.Context) {
	// 获取在线用户数
	userKeys, err := redis.Keys(onlineUserPrefix + "*")
	if err != nil {
		response.ServerError(c, "获取在线用户失败")
		return
	}

	// 获取在线游客数
	guestKeys, err := redis.Keys(onlineGuestPrefix + "*")
	if err != nil {
		response.ServerError(c, "获取在线游客失败")
		return
	}

	response.Success(c, gin.H{
		"total":  len(userKeys) + len(guestKeys),
		"users":  len(userKeys),
		"guests": len(guestKeys),
	})
}

// GetRealtimeVisits 获取实时访问数据
// @Summary 获取实时访问数据
// @Description 获取最近1小时的访问量趋势（按分钟统计）
// @Tags 数据分析
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.Response{data=object{timestamps=[]string,visits=[]int64}} "获取成功"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /analytics/visits/realtime [get]
func (s *AnalyticsService) GetRealtimeVisits(c *gin.Context) {
	now := time.Now()
	timestamps := make([]string, 60)
	visits := make([]int64, 60)

	// 统计最近60分钟的访问量
	for i := 59; i >= 0; i-- {
		minuteTime := now.Add(time.Duration(-i) * time.Minute)
		timestamps[59-i] = minuteTime.Format("15:04")

		startTime := minuteTime.Truncate(time.Minute)
		endTime := startTime.Add(time.Minute)

		var count int64
		s.data.GetDB().Model(&po.PageVisit{}).
			Where("created_at >= ? AND created_at < ?", startTime, endTime).
			Count(&count)
		visits[59-i] = count
	}

	response.Success(c, gin.H{
		"timestamps": timestamps,
		"visits":     visits,
	})
}

// GetTopPages 获取热门页面访问统计
// @Summary 获取热门页面
// @Description 获取访问量最高的页面列表（近7天）
// @Tags 数据分析
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param limit query int false "返回数量" default(10)
// @Success 200 {object} response.Response{data=[]object{path=string,visits=int64,avg_duration=float64}} "获取成功"
// @Failure 401 {object} response.Response "未授权"
// @Failure 500 {object} response.Response "服务器错误"
// @Router /analytics/pages/top [get]
func (s *AnalyticsService) GetTopPages(c *gin.Context) {
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		fmt.Sscanf(limitStr, "%d", &limit)
	}

	type PageStats struct {
		Path        string  `json:"path"`
		Visits      int64   `json:"visits"`
		AvgDuration float64 `json:"avg_duration"`
	}

	var stats []PageStats
	startTime := time.Now().AddDate(0, 0, -7)

	err := s.data.GetDB().Model(&po.PageVisit{}).
		Select("path, COUNT(*) as visits, AVG(duration) as avg_duration").
		Where("created_at >= ?", startTime).
		Group("path").
		Order("visits DESC").
		Limit(limit).
		Find(&stats).Error

	if err != nil {
		response.ServerError(c, "获取热门页面失败")
		return
	}

	response.Success(c, stats)
}

// getIPLocation 获取IP地理位置（简单实现）
// 实际项目中可以接入IP地址库或第三方API
func (s *AnalyticsService) getIPLocation(ip string) string {
	// 简单判断内网IP
	if strings.HasPrefix(ip, "192.168.") || strings.HasPrefix(ip, "10.") || strings.HasPrefix(ip, "127.") {
		return "内网"
	}
	// 这里可以接入IP地址库，如：ip2region、纯真IP库等
	// 或调用第三方API：高德、百度、ipapi.co等
	return "未知"
}
