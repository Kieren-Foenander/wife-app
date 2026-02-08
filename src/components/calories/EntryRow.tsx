import {
  formatCalories,
  formatPortion,
  formatTime,
  type CalorieEntry,
} from '@/lib/caloriesUtils'
import { Button } from '../ui/button'

type EntryRowProps = {
  entry: CalorieEntry
  onEdit?: (entry: CalorieEntry) => void
}

export function EntryRow({ entry, onEdit }: EntryRowProps) {
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
      <div className="flex flex-col items-end gap-2 text-right">
        <p className="text-base font-semibold text-foreground">
          {formatCalories(entry.calories)} kcal
        </p>
        {onEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onEdit(entry)}
          >
            Edit
          </Button>
        ) : null}
      </div>
    </li>
  )
}
