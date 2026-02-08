import { Utensils } from 'lucide-react'
import { Button } from '../ui/button'
import { ListRowSkeleton } from '../ui/skeleton'
import { Spinner } from '../ui/spinner'
import { type CalorieEntry } from '@/lib/caloriesUtils'
import { EntryRow } from './EntryRow'

type EntriesSectionProps = {
  entries: Array<CalorieEntry> | undefined
  title: string
  onAddClick: () => void
  onEditEntry: (entry: CalorieEntry) => void
}

export function EntriesSection({
  entries,
  title,
  onAddClick,
  onEditEntry,
}: EntriesSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Utensils
            className="size-5 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden
          />
          {title}
        </h2>
        <Button type="button" onClick={onAddClick}>
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
            <p className="text-sm text-muted-foreground">Loading entries...</p>
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
            {entries.map((entry) => (
              <EntryRow key={entry._id} entry={entry} onEdit={onEditEntry} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
