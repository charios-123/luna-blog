import ProfileCard from '@/components/widgets/ProfileCard'
import WeatherWidget from '@/components/widgets/WeatherWidget'
import MiniCalendar from '@/components/widgets/MiniCalendar'
import StatsWidget from '@/components/widgets/StatsWidget'
import LatestActivity from '@/components/widgets/LatestActivity'
import DailyQuote from '@/components/widgets/DailyQuote'

export default function GlobalSidebar({ side }: { side: 'left' | 'right' }) {
  if (side === 'left') {
    return (
      <>
        <ProfileCard />
        <StatsWidget />
        <LatestActivity />
      </>
    )
  }
  return (
    <>
      <WeatherWidget />
      <MiniCalendar />
      <DailyQuote />
    </>
  )
}
