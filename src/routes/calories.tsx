import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from 'convex/react'

import { BottomNav } from '../components/BottomNav'
import {
  APP_TIME_ZONE,
  addDaysUTC,
  fromYYYYMMDD,
  startOfDayUTCFromDate,
  toYYYYMMDDUTC,
} from '../lib/dateUtils'
import { api } from '../../convex/_generated/api'
import { CaloriesDrawer } from '../components/calories/CaloriesDrawer'
import { CaloriesHeader } from '../components/calories/CaloriesHeader'
import { CaloriesSummaryCard } from '../components/calories/CaloriesSummaryCard'
import { EntriesSection } from '../components/calories/EntriesSection'
import { WeightTrendSection } from '../components/calories/WeightTrendSection'
import { type CalorieEntry, type WeightEntry } from '@/lib/caloriesUtils'

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
  }) as Array<CalorieEntry> | undefined
  const weightEntries = useQuery(api.weightEntries.listWeightEntriesForRange, {
    startDayMs: weightRangeStart,
    endDayMs: weightRangeEnd,
  }) as Array<WeightEntry> | undefined
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<CalorieEntry | null>(null)
  const isSelectedToday = dayStartMs === startOfDayUTCFromDate(new Date())
  const addContextLabel = isSelectedToday
    ? 'Today'
    : selectedDate.toLocaleDateString('en-US', {
        timeZone: APP_TIME_ZONE,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
  const entriesTitle = isSelectedToday ? "Today's entries" : 'Entries'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 pb-32 pt-4"
        aria-label="Calories home"
      >
        <CaloriesHeader
          selectedDate={selectedDate}
          isSelectedToday={isSelectedToday}
        />
        <CaloriesSummaryCard totals={totals} dayStartMs={dayStartMs} />
        <WeightTrendSection
          weightEntries={weightEntries}
          startDayMs={weightRangeStart}
          endDayMs={weightRangeEnd}
        />
        <EntriesSection
          entries={entries}
          title={entriesTitle}
          onAddClick={() => {
            setEditEntry(null)
            setDrawerOpen(true)
          }}
          onEditEntry={(entry) => {
            setEditEntry(entry)
            setDrawerOpen(true)
          }}
        />
      </main>
      <CaloriesDrawer
        open={drawerOpen}
        onOpenChange={(nextOpen) => {
          setDrawerOpen(nextOpen)
          if (!nextOpen) {
            setEditEntry(null)
          }
        }}
        dayStartMs={dayStartMs}
        addContextLabel={addContextLabel}
        editEntry={editEntry}
      />
      <BottomNav active="calories" />
    </div>
  )
}
