package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/charios-123/luna-blog/pkg/response"
	"github.com/gin-gonic/gin"
)

// qwGeoResp 和风天气城市查询响应
type qwGeoResp struct {
	Code     string `json:"code"`
	Location []struct {
		Name string `json:"name"`
		ID   string `json:"id"`
	} `json:"location"`
}

// qwWeatherResp 和风天气实时/预报响应(只取需要的字段)
type qwWeatherResp struct {
	Code string `json:"code"`
	Now  struct {
		Temp      string `json:"temp"`
		FeelsLike string `json:"feelsLike"`
		Icon      string `json:"icon"`
		Text      string `json:"text"`
		Humidity  string `json:"humidity"`
		WindDir   string `json:"windDir"`
		WindSpeed string `json:"windSpeed"`
		Vis       string `json:"vis"`
	} `json:"now"`
	Daily []struct {
		FxDate  string `json:"fxDate"`
		TempMax string `json:"tempMax"`
		TempMin string `json:"tempMin"`
		IconDay string `json:"iconDay"`
		TextDay string `json:"textDay"`
	} `json:"daily"`
}

// WeatherNow 当前天气
type WeatherNow struct {
	TempC         string `json:"temp_c"`
	FeelsLikeC    string `json:"feelslike_c"`
	WeatherCode   string `json:"weather_code"`
	WeatherName   string `json:"weather_name"`
	Humidity      string `json:"humidity"`
	WinddirString string `json:"winddir_string"`
	WindspeedKph  string `json:"windspeed_kph"`
	VisibilityKm  string `json:"visibility_km"`
}

// WeatherForecastDay 天气预报(天)
type WeatherForecastDay struct {
	Date        string `json:"date"`
	MaxTemp     string `json:"maxTemp"`
	MinTemp     string `json:"minTemp"`
	WeatherCode string `json:"weather_code"`
	WeatherName string `json:"weather_name"`
}

// WeatherResponse 天气响应
type WeatherResponse struct {
	Location string               `json:"location"`
	Current  WeatherNow           `json:"current"`
	Forecast []WeatherForecastDay `json:"forecast"`
}

// WeatherService 天气服务(后端代理和风天气,避免在前端暴露 API Key)
type WeatherService struct {
	apiKey string
	host   string
	city   string

	mu       sync.Mutex
	geoCache map[string]*geoEntry     // 城市名/IP → 定位结果缓存(IP/城市名长期稳定)
	cache    map[string]*weatherCache // locID → 天气数据缓存(按城市分桶,防串数据)
}

type geoEntry struct {
	id   string
	name string
}

type weatherCache struct {
	data     *WeatherResponse
	expireAt time.Time
}

// NewWeatherService 创建天气服务
func NewWeatherService(apiKey, host, city string) *WeatherService {
	if host == "" {
		// 旧版账号默认走公共 Host
		host = "https://devapi.qweather.com"
	}
	return &WeatherService{
		apiKey:   apiKey,
		host:     host,
		city:     city,
		geoCache: make(map[string]*geoEntry),
		cache:    make(map[string]*weatherCache),
	}
}

// GetWeather 获取天气
// @Summary 获取天气
// @Description 获取当前天气和 3 天预报(和风天气)
// @Tags 博客前台
// @Accept json
// @Produce json
// @Success 200 {object} response.Response "获取成功"
// @Failure 500 {object} response.Response "天气服务未配置或查询失败"
// @Router /blog/weather [get]
func (s *WeatherService) GetWeather(c *gin.Context) {
	// 传入访问者 IP 用于自动定位;本机/内网 IP 无法定位时自动回退默认城市
	data, err := s.fetchWeather(c.ClientIP())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, data)
}

// fetchWeather 带缓存获取(30 分钟,控制免费版调用频率)
// 缓存按城市(locID)分桶,避免不同城市的访问者串数据
func (s *WeatherService) fetchWeather(ip string) (*WeatherResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.apiKey == "" {
		return nil, fmt.Errorf("天气服务未配置 API Key,请设置环境变量 QWEATHER_API_KEY")
	}

	// 1) 定位城市:公网 IP 自动定位,否则回退默认城市
	locID, locName, err := s.resolveLocation(ip)
	if err != nil {
		return nil, err
	}

	// 2) 命中该城市缓存则直接返回
	if c, ok := s.cache[locID]; ok && time.Now().Before(c.expireAt) {
		return c.data, nil
	}

	now, err := s.getNow(locID)
	if err != nil {
		return nil, err
	}

	daily, err := s.get3Day(locID)
	if err != nil {
		return nil, err
	}

	data := &WeatherResponse{
		Location: locName,
		Current:  *now,
		Forecast: daily,
	}
	s.cache[locID] = &weatherCache{data: data, expireAt: time.Now().Add(30 * time.Minute)}
	return data, nil
}

// resolveLocation 定位城市:优先按公网 IP 反查,失败或无公网 IP 时回退默认城市
func (s *WeatherService) resolveLocation(ip string) (id, name string, err error) {
	if ip != "" && !isPrivateIP(ip) {
		if id, name, gerr := s.lookupGeo(ip); gerr == nil {
			return id, name, nil
		}
	}
	if strings.TrimSpace(s.city) == "" {
		return "", "", fmt.Errorf("天气服务未配置城市,请设置 config.yaml 的 weather.city")
	}
	return s.lookupGeo(s.city)
}

// lookupGeo 将城市名或 IP 解析为 location id(和风 geo 接口支持 IP 反查归属城市)
// 结果按 location 字符串缓存,IP/城市名长期稳定,避免每次请求都打 geo 接口
func (s *WeatherService) lookupGeo(loc string) (id, name string, err error) {
	if e, ok := s.geoCache[loc]; ok {
		return e.id, e.name, nil
	}
	var resp qwGeoResp
	u := fmt.Sprintf("%s/geo/v2/city/lookup?location=%s&key=%s&number=1",
		s.host, url.QueryEscape(loc), s.apiKey)
	if err = s.getJSON(u, &resp); err != nil {
		return "", "", fmt.Errorf("城市查询失败: %w", err)
	}
	if resp.Code != "200" || len(resp.Location) == 0 {
		return "", "", fmt.Errorf("未找到城市: %s", loc)
	}
	entry := &geoEntry{id: resp.Location[0].ID, name: resp.Location[0].Name}
	s.geoCache[loc] = entry
	return entry.id, entry.name, nil
}

// isPrivateIP 判断 IP 是否为本机/内网地址(此类地址无法用于 IP 定位,需回退默认城市)
func isPrivateIP(ip string) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return true
	}
	return parsed.IsLoopback() || parsed.IsPrivate() || parsed.IsLinkLocalUnicast() || parsed.IsUnspecified()
}

// getNow 实时天气
func (s *WeatherService) getNow(locID string) (*WeatherNow, error) {
	var resp qwWeatherResp
	u := fmt.Sprintf("%s/v7/weather/now?location=%s&key=%s", s.host, locID, s.apiKey)
	if err := s.getJSON(u, &resp); err != nil {
		return nil, fmt.Errorf("实时天气查询失败: %w", err)
	}
	if resp.Code != "200" {
		return nil, fmt.Errorf("实时天气查询失败(code=%s)", resp.Code)
	}
	return &WeatherNow{
		TempC:         resp.Now.Temp,
		FeelsLikeC:    resp.Now.FeelsLike,
		WeatherCode:   resp.Now.Icon,
		WeatherName:   resp.Now.Text,
		Humidity:      resp.Now.Humidity,
		WinddirString: resp.Now.WindDir,
		WindspeedKph:  resp.Now.WindSpeed,
		VisibilityKm:  resp.Now.Vis,
	}, nil
}

// get3Day 3 天预报
func (s *WeatherService) get3Day(locID string) ([]WeatherForecastDay, error) {
	var resp qwWeatherResp
	u := fmt.Sprintf("%s/v7/weather/3d?location=%s&key=%s", s.host, locID, s.apiKey)
	if err := s.getJSON(u, &resp); err != nil {
		return nil, fmt.Errorf("天气预报查询失败: %w", err)
	}
	if resp.Code != "200" {
		return nil, fmt.Errorf("天气预报查询失败(code=%s)", resp.Code)
	}
	forecast := make([]WeatherForecastDay, 0, len(resp.Daily))
	for _, d := range resp.Daily {
		forecast = append(forecast, WeatherForecastDay{
			Date:        d.FxDate,
			MaxTemp:     d.TempMax,
			MinTemp:     d.TempMin,
			WeatherCode: d.IconDay,
			WeatherName: d.TextDay,
		})
	}
	return forecast, nil
}

func (s *WeatherService) getJSON(u string, out any) error {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(u)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, out)
}
