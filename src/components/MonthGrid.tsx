import {
  APP_TIME_ZONE,
  getDatePartsInTimeZone,
  getMonthGridFor,
  startOfDayUTCFromDate,
} from '../lib/dateUtils'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthGrid({
  selectedDate,
  onSelectDay,
}: {
  selectedDate: Date
  onSelectDay: (d: Date) => void
}) {
  const grid = getMonthGridFor(selectedDate)
  const todayStartMs = startOfDayUTCFromDate(new Date())

  return (
    <section
      role="region"
      aria-label="Month"
      className="overflow-x-auto rounded-2xl border border-border bg-card/70 p-4"
    >
      <div className="grid min-w-0 grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {grid.flat().map((d, i) => {
          if (d === null) {
            return (
              <div
                key={`empty-${i}`}
                className="aspect-square rounded-lg border border-border/70 bg-background/40 p-1 text-muted-foreground/80"
              />
            )
          }
          const isToday = d.getTime() === todayStartMs
          const isSelected = d.getTime() === startOfDayUTCFromDate(selectedDate)
          const { day } = getDatePartsInTimeZone(d)
          return (
            <button
              type="button"
              key={d.toISOString()}
              onClick={() => onSelectDay(d)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border p-1 transition-colors ${isSelected
                ? 'border-primary/40 bg-primary/20 text-foreground ring-2 ring-primary/30'
                : isToday
                  ? 'border-primary/30 bg-primary/10 text-foreground hover:bg-primary/20'
                  : 'border-border bg-background/60 text-muted-foreground hover:bg-accent/40'
                }`}
              aria-label={d.toLocaleDateString('en-US', {
                timeZone: APP_TIME_ZONE,
                month: 'short',
                day: 'numeric',
              })}
              aria-pressed={isSelected}
            >
              <span className="text-sm font-medium tabular-nums">
                {day}
              </span>
              {isToday ? (
                <span className="pointer-events-none absolute -right-4 -top-2 rounded bg-accent/70 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-accent-foreground rotate-12">
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
