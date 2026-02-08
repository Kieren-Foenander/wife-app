import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Utensils } from 'lucide-react'
import { toast } from 'sonner'

import { BottomNav } from '../components/BottomNav'
import { Button } from '../components/ui/button'
import { ListRowSkeleton, Skeleton } from '../components/ui/skeleton'
import { Spinner } from '../components/ui/spinner'
import {
  APP_TIME_ZONE,
  addDaysUTC,
  fromYYYYMMDD,
  startOfDayUTCFromDate,
  toYYYYMMDDUTC,
} from '../lib/dateUtils'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/calories')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): {
    date?: string
  } => {
    const date =
      typeof search.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : undefined
    return { date }
  },
  component: CaloriesHome,
})

function formatCalories(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

function formatWeight(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(
    value,
  )
}

function formatTime(timestampMs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestampMs))
}

function formatPortion(entry: { grams?: number; servings?: number }): string {
  if (entry.grams != null) {
    return `${formatNumber(entry.grams)} g`
  }
  if (entry.servings != null) {
    const servingsLabel = formatNumber(entry.servings, 2)
    const suffix = entry.servings === 1 ? 'serving' : 'servings'
    return `${servingsLabel} ${suffix}`
  }
  return 'Portion not set'
}

function WeightTrend({
  entries,
  startDayMs,
  endDayMs,
}: {
  entries: Array<{ dayStartMs: number; kg: number }>
  startDayMs: number
  endDayMs: number
}) {
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

function ProgressRing({
  consumed,
  goal,
}: {
  consumed: number
  goal: number
}) {
  const normalizedGoal = Math.max(goal, 0)
  const ratio =
    normalizedGoal === 0 ? 0 : Math.min(consumed / normalizedGoal, 1)
  const isOver = normalizedGoal > 0 && consumed > normalizedGoal
  const size = 160
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - ratio)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} role="img">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={isOver ? 'text-destructive' : 'text-primary'}
            style={{ transition: 'stroke-dashoffset 200ms ease-out' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            {isOver ? 'Over' : 'Progress'}
          </p>
          <p className="text-2xl font-semibold text-foreground">
            {normalizedGoal === 0
              ? '0%'
              : `${Math.round((consumed / normalizedGoal) * 100)}%`}
          </p>
        </div>
      </div>
      <div
        className="text-xs text-muted-foreground"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={normalizedGoal || 0}
        aria-valuenow={Math.min(consumed, normalizedGoal)}
        aria-label="Calories progress"
      >
        {formatCalories(consumed)} / {formatCalories(goal)} kcal
      </div>
    </div>
  )
}

function CaloriesHome() {
  const { date: dateStr } = Route.useSearch()
  const selectedDate = dateStr
    ? fromYYYYMMDD(dateStr)
    : fromYYYYMMDD(toYYYYMMDDUTC(new Date()))
  const dayStartMs = startOfDayUTCFromDate(selectedDate)
  const todayDate = fromYYYYMMDD(toYYYYMMDDUTC(new Date()))
  const weightRangeStartDate = addDaysUTC(todayDate, -29)
  const weightRangeStart = startOfDayUTCFromDate(weightRangeStartDate)
  const weightRangeEnd = startOfDayUTCFromDate(todayDate)
  const totals = useQuery(api.calorieEntries.getDayTotals, { dayStartMs })
  const entries = useQuery(api.calorieEntries.listEntriesForDay, {
    dayStartMs,
    order: 'desc',
  })
  const weightEntries = useQuery(api.weightEntries.listWeightEntriesForRange, {
    startDayMs: weightRangeStart,
    endDayMs: weightRangeEnd,
  })
  const isSelectedToday =
    dayStartMs === startOfDayUTCFromDate(new Date())
  const entriesTitle = isSelectedToday ? "Today's entries" : 'Entries'
  const handleAddClick = () => {
    toast('Add flow coming soon.')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 pb-32 pt-4"
        aria-label="Calories home"
      >
        <header className="space-y-4">
          <p className="text-center text-xl font-semibold text-muted-foreground">
            Wife App
          </p>
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              {isSelectedToday
                ? `Today - ${selectedDate.toLocaleDateString('en-US', {
                  timeZone: APP_TIME_ZONE,
                  weekday: 'long',
                })}`
                : selectedDate.toLocaleDateString('en-US', {
                  timeZone: APP_TIME_ZONE,
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
            </p>
            <h1 className="text-4xl font-semibold text-foreground">Calories</h1>
            <p className="text-base text-muted-foreground">
              Stay on track with a quick daily check-in.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card/70 p-6">
          {totals === undefined ? (
            <div
              className="flex flex-col items-center gap-3 py-6"
              role="status"
              aria-label="Loading calorie totals"
            >
              <Spinner aria-label="Loading calorie totals" size={24} />
              <p className="text-sm text-muted-foreground">Loading totals...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <ProgressRing consumed={totals.consumed} goal={totals.goal} />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Remaining
                </p>
                <p className="text-5xl font-semibold text-foreground">
                  {formatCalories(totals.remaining)} kcal
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  Consumed: {formatCalories(totals.consumed)} kcal
                </span>
                <span>Goal: {formatCalories(totals.goal)} kcal</span>
              </div>
              {totals.resetWeekActive ? (
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                  <p className="font-medium">Reset week active</p>
                  <p className="text-xs text-muted-foreground">
                    Streak paused while you focus on maintenance.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              30-day weight trend
            </h2>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-6">
            {weightEntries === undefined ? (
              <div
                className="flex flex-col gap-4"
                role="status"
                aria-label="Loading weight trend"
              >
                <Skeleton className="h-40 w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ) : (
              <WeightTrend
                entries={weightEntries.map((entry) => ({
                  dayStartMs: entry.dayStartMs,
                  kg: entry.kg,
                }))}
                startDayMs={weightRangeStart}
                endDayMs={weightRangeEnd}
              />
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Utensils
                className="size-5 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden
              />
              {entriesTitle}
            </h2>
            <Button type="button" onClick={handleAddClick}>
              + Add
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-6">
            {entries === undefined ? (
              <div
                className="flex flex-col items-center gap-4 py-8"
                role="status"
                aria-label="Loading entries"
              >
                <Spinner aria-label="Loading entries" size={24} />
                <p className="text-sm text-muted-foreground">
                  Loading entries...
                </p>
                <ul className="w-full space-y-2">
                  {[1, 2, 3].map((i) => (
                    <ListRowSkeleton key={i} />
                  ))}
                </ul>
              </div>
            ) : entries.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-3 py-10 text-center"
                role="status"
                aria-label="No entries"
              >
                <Utensils
                  className="size-12 text-muted-foreground"
                  strokeWidth={1.25}
                  aria-hidden
                />
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">
                    No entries yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tap + Add to log your first meal.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {entries.map((entry) => {
                  const portionLabel = formatPortion(entry)
                  return (
                    <li
                      key={entry._id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3"
                    >
                      <div className="space-y-1">
                        <p className="text-base font-medium text-foreground">
                          {entry.label}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatTime(entry.timestampMs)}</span>
                          <span aria-hidden="true">•</span>
                          <span>{portionLabel}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-foreground">
                          {formatCalories(entry.calories)} kcal
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </main>
      <BottomNav active="calories" />
    </div>
  )
}
