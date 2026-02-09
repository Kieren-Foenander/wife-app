import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { api } from '../../../convex/_generated/api'
import { APP_TIME_ZONE, addDaysUTC } from '@/lib/dateUtils'
import { formatCalories, type DayTotals } from '@/lib/caloriesUtils'
import { ProgressRing } from './ProgressRing'

type CaloriesSummaryCardProps = {
  totals: DayTotals | undefined
  dayStartMs: number
}

export function CaloriesSummaryCard({
  totals,
  dayStartMs,
}: CaloriesSummaryCardProps) {
  const settings = useQuery(api.calorieSettings.getCalorieSettings)
  const updateSettings = useMutation(api.calorieSettings.updateCalorieSettings)
  const [normalGoalInput, setNormalGoalInput] = useState('')
  const [resetGoalInput, setResetGoalInput] = useState('')
  const [isSavingGoals, setIsSavingGoals] = useState(false)
  const [isUpdatingResetWeek, setIsUpdatingResetWeek] = useState(false)
  const resetWeekStartMs = settings?.resetWeekStartMs ?? null
  const resetWeekEndMs = settings?.resetWeekEndMs ?? null
  const formatResetDate = (valueMs: number) =>
    new Date(valueMs).toLocaleDateString('en-US', {
      timeZone: APP_TIME_ZONE,
      month: 'short',
      day: 'numeric',
    })
  const resetWeekRange =
    resetWeekStartMs != null
      ? `${formatResetDate(resetWeekStartMs)}${
          resetWeekEndMs != null ? `–${formatResetDate(resetWeekEndMs)}` : ''
        }`
      : null
  const canToggleResetWeek = totals != null && settings != null && !isUpdatingResetWeek
  const canEditGoals = settings != null && !isSavingGoals

  useEffect(() => {
    if (!settings) return
    setNormalGoalInput(String(settings.normalGoal))
    setResetGoalInput(String(settings.maintenanceGoal))
  }, [settings?.normalGoal, settings?.maintenanceGoal])

  const parseGoalInput = (value: string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return null
    return Math.round(parsed)
  }

  const handleSaveGoals = async () => {
    if (!settings) return
    const nextNormal = parseGoalInput(normalGoalInput)
    const nextReset = parseGoalInput(resetGoalInput)
    if (nextNormal == null || nextNormal <= 0) {
      toast('Normal goal must be a positive number.')
      return
    }
    if (nextReset == null || nextReset <= 0) {
      toast('Reset week goal must be a positive number.')
      return
    }
    setIsSavingGoals(true)
    try {
      await updateSettings({
        normalGoal: nextNormal,
        maintenanceGoal: nextReset,
      })
      toast('Calorie goals updated.')
    } catch (error) {
      toast('Goal update failed. Try again.')
    } finally {
      setIsSavingGoals(false)
    }
  }

  const handleStartResetWeek = async () => {
    if (!totals || !settings) return
    setIsUpdatingResetWeek(true)
    try {
      const startMs = dayStartMs
      const endDate = addDaysUTC(new Date(startMs), 6)
      await updateSettings({
        resetWeekStartMs: startMs,
        resetWeekEndMs: endDate.getTime(),
      })
      toast('Reset week started.')
    } catch (error) {
      toast('Reset week update failed. Try again.')
    } finally {
      setIsUpdatingResetWeek(false)
    }
  }

  const handleEndResetWeek = async () => {
    if (!totals || !settings) return
    setIsUpdatingResetWeek(true)
    try {
      await updateSettings({
        resetWeekStartMs: null,
        resetWeekEndMs: null,
      })
      toast('Reset week ended.')
    } catch (error) {
      toast('Reset week update failed. Try again.')
    } finally {
      setIsUpdatingResetWeek(false)
    }
  }
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
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Daily goals</p>
                <p className="text-xs text-muted-foreground">
                  Set normal and reset week targets anytime.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleSaveGoals}
                disabled={!canEditGoals}
              >
                {isSavingGoals ? 'Saving...' : 'Save goals'}
              </Button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Normal goal
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none disabled:opacity-70"
                  value={normalGoalInput}
                  onChange={(event) => setNormalGoalInput(event.target.value)}
                  disabled={!canEditGoals}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Reset week goal
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none disabled:opacity-70"
                  value={resetGoalInput}
                  onChange={(event) => setResetGoalInput(event.target.value)}
                  disabled={!canEditGoals}
                />
              </label>
            </div>
          </div>
          {totals.resetWeekActive ? (
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
              <p className="font-medium">Reset week active</p>
              <p className="text-xs text-muted-foreground">
                Streak paused while you focus on maintenance.
              </p>
            </div>
          ) : null}
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Reset week</p>
                <p className="text-xs text-muted-foreground">
                  Maintenance calories for 7 days.
                </p>
                {resetWeekRange ? (
                  <p className="text-xs text-muted-foreground">
                    Range: {resetWeekRange}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant={totals.resetWeekActive ? 'secondary' : 'default'}
                onClick={
                  totals.resetWeekActive ? handleEndResetWeek : handleStartResetWeek
                }
                disabled={!canToggleResetWeek}
              >
                {isUpdatingResetWeek
                  ? 'Saving...'
                  : totals.resetWeekActive
                    ? 'End reset week'
                    : 'Start reset week'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
