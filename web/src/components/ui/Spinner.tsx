import { cn } from '@/lib/utils'

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl'
const sizeMap: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
  xl: 'h-12 w-12 border-4',
}

export default function Spinner({
  size = 'md',
  className,
}: {
  size?: SpinnerSize
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-solid border-transparent',
        sizeMap[size],
        className,
      )}
      style={{
        borderTopColor: 'var(--accent-primary)',
        borderLeftColor: 'var(--accent-primary)',
      }}
      aria-label="加载中"
    />
  )
}
