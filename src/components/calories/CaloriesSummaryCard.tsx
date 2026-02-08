import { Spinner } from '../ui/spinner'
import { formatCalories, type DayTotals } from '@/lib/caloriesUtils'
import { ProgressRing } from './ProgressRing'

type CaloriesSummaryCardProps = {
  totals: DayTotals | undefined
}

export function CaloriesSummaryCard({ totals }: CaloriesSummaryCardProps) {
  return (
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
            <span>Consumed: {formatCalories(totals.consumed)} kcal</span>
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
  )
}
