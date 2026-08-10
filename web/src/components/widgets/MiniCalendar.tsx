import { useState, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface MiniCalendarProps {
  markedDates?: string[] // 有文章的日期，格式: YYYY-MM-DD
  onDateClick?: (date: string) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function MiniCalendar({ markedDates = [], onDateClick }: MiniCalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const startDay = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []
    for (let i = 0; i < startDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [startDay, daysInMonth])

  const formatDate = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${currentYear}-${m}-${d}`
  }

  const isToday = (day: number) => {
    return today.getFullYear() === currentYear &&
           today.getMonth() === currentMonth &&
           today.getDate() === day
  }

  const isMarked = (day: number) => markedDates.includes(formatDate(day))

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  return (
    <div className="card p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
          <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
          {currentYear}年 {currentMonth + 1}月
        </h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-[var(--bg-surface-alt)]" style={{ color: 'var(--text-muted)' }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-[var(--bg-surface-alt)]" style={{ color: 'var(--text-muted)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-subtle)' }}>
            {w}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => (
          <button
            key={idx}
            disabled={!day}
            onClick={() => day && onDateClick?.(formatDate(day))}
            className={`
              aspect-square rounded-[var(--radius-md)] text-xs font-medium transition-all relative
              ${day ? 'hover:bg-[var(--bg-surface-alt)] cursor-pointer' : 'cursor-default'}
              ${day && isToday(day) ? 'ring-2 ring-[var(--accent-primary)] text-[var(--accent-primary)]' : ''}
              ${day && !isToday(day) ? 'text-[var(--text-fg)]' : ''}
            `}
            style={{
              background: day && isMarked(day) ? 'color-mix(in srgb, var(--accent-primary) 14%, transparent)' : 'transparent',
            }}
          >
            {day}
            {day && isMarked(day) && (
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ background: 'var(--accent-primary)' }}
              />
            )}
          </button>
        ))}
      </div>

      {markedDates.length > 0 && (
        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs" style={{ borderColor: 'var(--border-muted)', color: 'var(--text-subtle)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-primary)' }} />
          <span>有更新</span>
        </div>
      )}
    </div>
  )
}
