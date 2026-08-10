import { useQuery } from '@tanstack/react-query'
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, Eye } from 'lucide-react'

interface WeatherData {
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
  'Sunny': Sun,
  'Clear': Sun,
  'Partly cloudy': Cloud,
  'Partly Cloudy': Cloud,
  'Cloudy': Cloud,
  'Overcast': Cloud,
  'Mist': Cloud,
  'Fog': Cloud,
  'Patchy rain possible': CloudRain,
  'Patchy snow possible': CloudSnow,
  'Patchy sleet possible': CloudSnow,
  'Patchy freezing drizzle possible': CloudRain,
  'Thundery outbreaks possible': CloudLightning,
  'Blowing snow': CloudSnow,
  'Blizzard': CloudSnow,
  'Light drizzle': CloudRain,
  'Patchy light drizzle': CloudRain,
  'Light rain': CloudRain,
  'Moderate rain at times': CloudRain,
  'Moderate rain': CloudRain,
  'Heavy rain at times': CloudRain,
  'Heavy rain': CloudRain,
  'Light snow': CloudSnow,
  'Moderate snow': CloudSnow,
  'Heavy snow': CloudSnow,
  'Patchy light snow': CloudSnow,
  'Patchy moderate snow': CloudSnow,
  'Patchy heavy snow': CloudSnow,
  'Ice pellets': CloudRain,
  'Light rain shower': CloudRain,
  'Moderate or heavy rain shower': CloudRain,
  'Torrential rain shower': CloudRain,
  'Light snow showers': CloudSnow,
  'Moderate or heavy snow showers': CloudSnow,
  'Light showers of ice pellets': CloudRain,
  'Moderate or heavy showers of ice pellets': CloudRain,
  'Patchy light rain with thunder': CloudLightning,
  'Moderate or heavy rain with thunder': CloudLightning,
  'Patchy light snow with thunder': CloudLightning,
  'Moderate or heavy snow with thunder': CloudLightning,
}

function getWeatherIcon(name: string) {
  const Icon = WEATHER_ICONS[name] || Cloud
  return Icon
}

export default function WeatherWidget() {
  const { data, isLoading } = useQuery<WeatherData>({
    queryKey: ['weather'],
    queryFn: async () => {
      const res = await fetch('https://wttr.in/?format=j1')
      if (!res.ok) throw new Error('Failed to fetch weather')
      const json = await res.json()
      const current = json.current_condition[0]
      const forecast = json.weather.slice(0, 3).map((w: any) => ({
        date: w.date,
        maxTemp: w.maxtempC,
        minTemp: w.mintempC,
        weather_code: w.hourly[4].weatherCode,
        weather_name: w.hourly[4].weatherDesc[0].value,
      }))
      return {
        current: {
          temp_c: current.temp_C,
          feelslike_c: current.FeelsLikeC,
          weather_code: current.weatherCode,
          weather_name: current.weatherDesc[0].value,
          humidity: current.humidity,
          winddir_string: current.winddir16Point,
          windspeed_kph: current.windspeedKmph,
          visibility_km: current.visibility,
        },
        forecast,
      }
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

  if (!data) return null

  const CurrentIcon = getWeatherIcon(data.current.weather_name)

  return (
    <div className="card p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
      <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
        <Cloud size={16} style={{ color: 'var(--accent-primary)' }} />
        今日天气
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
          const ForecastIcon = getWeatherIcon(f.weather_name)
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
