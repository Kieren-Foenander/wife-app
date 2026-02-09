import { APP_TIME_ZONE } from '../../lib/dateUtils'
import { formatWeight, type WeightEntry } from '@/lib/caloriesUtils'

type WeightTrendProps = {
  entries: Array<WeightEntry>
  startDayMs: number
  endDayMs: number
}

export function WeightTrend({ entries, startDayMs, endDayMs }: WeightTrendProps) {
  if (entries.length < 2) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-10 text-center"
        role="status"
        aria-label="Weight trend empty state"
      >
        <p className="text-base font-medium text-foreground">
          Add your weight to see trend
        </p>
        <p className="text-sm text-muted-foreground">
          Once you have a couple of weigh-ins, we&apos;ll plot your last 30
          days.
        </p>
      </div>
    )
  }

  const sorted = [...entries].sort((a, b) => a.dayStartMs - b.dayStartMs)
  const weights = sorted.map((entry) => entry.kg)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = Math.max(max - min, 0.5)
  const padding = range * 0.1
  const minValue = min - padding
  const maxValue = max + padding

  const width = 320
  const height = 140
  const paddingX = 16
  const paddingY = 18
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2
  const span = Math.max(endDayMs - startDayMs, 1)

  const points = sorted.map((entry) => {
    const x =
      paddingX + ((entry.dayStartMs - startDayMs) / span) * innerWidth
    const ratio = (entry.kg - minValue) / Math.max(maxValue - minValue, 1)
    const y = paddingY + innerHeight - ratio * innerHeight
    return { x, y }
  })

  const path = points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(' ')

  const startLabel = new Date(startDayMs).toLocaleDateString('en-US', {
    timeZone: APP_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  })
  const endLabel = new Date(endDayMs).toLocaleDateString('en-US', {
    timeZone: APP_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full"
        role="img"
        aria-label="Weight trend line chart"
      >
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="text-primary"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={3.5}
            className="fill-primary"
          />
        ))}
      </svg>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{startLabel}</span>
        <span>
          {formatWeight(weights[0])} kg →{' '}
          {formatWeight(weights[weights.length - 1])} kg
        </span>
        <span>{endLabel}</span>
      </div>
    </div>
  )
}
