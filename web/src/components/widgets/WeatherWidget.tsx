import { useQuery } from '@tanstack/react-query'
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, Eye } from 'lucide-react'

interface WeatherData {
  location: string
  current: {
    temp_c: string
    feelslike_c: string
    weather_code: string
    weather_name: string
    humidity: string
    winddir_string: string
    windspeed_kph: string
    visibility_km: string
  }
  forecast: {
    date: string
    maxTemp: string
    minTemp: string
    weather_code: string
    weather_name: string
  }[]
}

const WEATHER_ICONS: Record<string, any> = {
  '100': Sun, // 晴
  '101': Cloud, // 多云
  '102': Cloud, // 少云
  '103': Cloud, // 晴间多云
  '104': Cloud, // 阴
  '300': CloudRain, // 阵雨
  '301': CloudRain, // 强阵雨
  '302': CloudLightning, // 雷阵雨
  '303': CloudLightning, // 强雷阵雨
  '304': CloudLightning, // 雷阵雨伴有冰雹
  '305': CloudRain, // 小雨
  '306': CloudRain, // 中雨
  '307': CloudRain, // 大雨
  '308': CloudRain, // 极端降雨
  '309': CloudRain, // 毛毛雨/细雨
  '310': CloudRain, // 暴雨
  '311': CloudRain, // 大暴雨
  '312': CloudRain, // 特大暴雨
  '313': CloudRain, // 冻雨
  '400': CloudSnow, // 小雪
  '401': CloudSnow, // 中雪
  '402': CloudSnow, // 大雪
  '403': CloudSnow, // 暴雪
  '404': CloudSnow, // 雨夹雪
  '405': CloudSnow, // 雨雪天气
  '406': CloudSnow, // 阵雨夹雪
  '407': CloudSnow, // 阵雪
  '408': CloudSnow, // 小到中雪
  '409': CloudSnow, // 中到大雪
  '410': CloudSnow, // 大到暴雪
  '500': Cloud, // 薄雾
  '501': Cloud, // 雾
  '502': Cloud, // 霾
  '503': Cloud, // 扬沙
  '504': Cloud, // 浮尘
  '507': Cloud, // 沙尘暴
  '508': Cloud, // 强沙尘暴
}

function getWeatherIcon(code: string) {
  const Icon = WEATHER_ICONS[code] || Cloud
  return Icon
}

export default function WeatherWidget() {
  const { data, isLoading } = useQuery<WeatherData>({
    queryKey: ['weather'],
    queryFn: async () => {
      // 走自家后端代理,避免在前端暴露和风天气 API Key
      const res = await fetch('/api/blog/weather')
      if (!res.ok) throw new Error('Failed to fetch weather')
      const json = await res.json()
      if (json.code !== 0) throw new Error(json.message || 'Failed to fetch weather')
      return json.data as WeatherData
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="h-4 w-24 bg-[var(--bg-surface-alt)] rounded mb-4" />
        <div className="flex items-end gap-2 mb-4">
          <div className="h-12 w-12 bg-[var(--bg-surface-alt)] rounded-lg" />
          <div className="h-10 w-16 bg-[var(--bg-surface-alt)] rounded" />
        </div>
        <div className="h-4 w-32 bg-[var(--bg-surface-alt)] rounded mb-2" />
        <div className="h-4 w-24 bg-[var(--bg-surface-alt)] rounded" />
      </div>
    )
  }

  if (!data) {
    // 接口失败时保留占位,避免整个组件消失
    return (
      <div className="card p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
          <Cloud size={16} style={{ color: 'var(--accent-primary)' }} />
          今日天气
        </h3>
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-subtle)' }}>
          天气服务暂不可用
        </p>
      </div>
    )
  }

  const CurrentIcon = getWeatherIcon(data.current.weather_code)

  return (
    <div className="card p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
      <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
        <Cloud size={16} style={{ color: 'var(--accent-primary)' }} />
        今日天气
        {data.location && (
          <span className="text-xs font-normal" style={{ color: 'var(--text-subtle)' }}>{data.location}</span>
        )}
      </h3>

      {/* Current */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-3 mb-1">
          <CurrentIcon size={42} style={{ color: 'var(--accent-warm)' }} />
          <span className="text-4xl font-bold" style={{ color: 'var(--text-heading)' }}>
            {data.current.temp_c}°
          </span>
        </div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {data.current.weather_name} · 体感 {data.current.feelslike_c}°
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-subtle)' }}>
          <span className="inline-flex items-center gap-1"><Droplets size={12} /> {data.current.humidity}%</span>
          <span className="inline-flex items-center gap-1"><Wind size={12} /> {data.current.windspeed_kph}km/h</span>
        </div>
      </div>

      {/* Forecast */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-muted)' }}>
        {data.forecast.map((f) => {
          const ForecastIcon = getWeatherIcon(f.weather_code)
          const day = new Date(f.date).toLocaleDateString('zh-CN', { weekday: 'short' })
          return (
            <div key={f.date} className="text-center p-2 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-surface-alt)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>{day}</div>
              <ForecastIcon size={20} className="mx-auto mb-1" style={{ color: 'var(--accent-primary)' }} />
              <div className="text-xs font-medium" style={{ color: 'var(--text-fg)' }}>
                {f.maxTemp}° / {f.minTemp}°
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
