import {
  formatCalories,
  formatPortion,
  formatTime,
  type CalorieEntry,
} from '@/lib/caloriesUtils'

type EntryRowProps = {
  entry: CalorieEntry
}

export function EntryRow({ entry }: EntryRowProps) {
  const portionLabel = formatPortion(entry)

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{entry.label}</p>
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
}
