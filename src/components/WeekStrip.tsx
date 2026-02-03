import { useMemo } from 'react'

import { getWeekDatesFor, startOfDayUTCFromDate } from '../lib/dateUtils'

export function WeekStrip({
  selectedDate,
  onSelectDay,
}: {
  selectedDate: Date
  onSelectDay: (d: Date) => void
}) {
  const weekDates = useMemo(
    () => getWeekDatesFor(selectedDate),
    [selectedDate],
  )
  const todayUTC = useMemo(
    () =>
      new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
        ),
      ),
    [],
  )

  return (
    <section
      role="region"
      aria-label="Week"
      className="overflow-x-auto rounded-2xl border border-border bg-card/70 p-4"
    >
      <div className="flex min-w-0 gap-2">
        {weekDates.map((d) => {
          const isToday =
            d.getUTCFullYear() === todayUTC.getUTCFullYear() &&
            d.getUTCMonth() === todayUTC.getUTCMonth() &&
            d.getUTCDate() === todayUTC.getUTCDate()
          const isSelected =
            d.getTime() === startOfDayUTCFromDate(selectedDate)
          return (
            <button
              type="button"
              key={d.toISOString()}
              onClick={() => onSelectDay(d)}
              className={`flex min-w-[4rem] flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-colors ${isSelected
                  ? 'border-primary/40 bg-primary/20 text-foreground ring-2 ring-primary/30'
                  : isToday
                    ? 'border-primary/30 bg-primary/10 text-foreground hover:bg-primary/20'
                    : 'border-border bg-background/60 text-muted-foreground hover:bg-accent/40'
                }`}
              aria-label={d.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
              aria-pressed={isSelected}
            >
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {d.getUTCDate()}
              </span>
              {isToday ? (
                <span className="rounded bg-accent/70 px-2 py-0.5 text-xs font-medium text-accent-foreground">
                  Today
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
