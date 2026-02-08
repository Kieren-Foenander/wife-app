import { Skeleton } from '../ui/skeleton'
import { WeightTrend } from './WeightTrend'
import { type WeightEntry } from '@/lib/caloriesUtils'

type WeightTrendSectionProps = {
  weightEntries: Array<WeightEntry> | undefined
  startDayMs: number
  endDayMs: number
}

export function WeightTrendSection({
  weightEntries,
  startDayMs,
  endDayMs,
}: WeightTrendSectionProps) {
  return (
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
            entries={weightEntries}
            startDayMs={startDayMs}
            endDayMs={endDayMs}
          />
        )}
      </div>
    </section>
  )
}
