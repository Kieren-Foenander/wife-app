import { useMemo } from 'react'
import { useQuery } from 'convex/react'

import { api } from '../../convex/_generated/api'
import { startOfDayUTCFromDate } from '../lib/dateUtils'
import type { Id } from '../../convex/_generated/dataModel'

type TaskCompletionIndicatorProps = {
  taskId: Id<'tasks'>
  completionOverride?: { total: number; completed: number }
}

export function TaskCompletionIndicator({
  taskId,
  completionOverride,
}: TaskCompletionIndicatorProps) {
  const todayStartMs = useMemo(
    () => startOfDayUTCFromDate(new Date()),
    [],
  )
  const completionFromQuery = useQuery(api.todos.getTaskCompletion, {
    taskId,
    dayStartMs: todayStartMs,
  })
  const completion = completionOverride ?? completionFromQuery

  if (!completion || completion.total === 0) {
    return null
  }

  const { total, completed } = completion
  const progress = Math.min(100, Math.round((completed / total) * 100))
  const isComplete = completed === total
  const isPartial = completed < total

  return (
    <div
      className="flex items-center gap-3 text-xs text-muted-foreground"
      data-testid="task-completion"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${completed} of ${total} tasks completed`}
    >
      <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="whitespace-nowrap">
        {completed}/{total} done
      </span>
      {isComplete ? (
        <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-foreground">
          Completed
        </span>
      ) : isPartial ? (
        <span className="rounded-full border border-accent/40 bg-accent/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-accent-foreground">
          Partial
        </span>
      ) : null}
    </div>
  )
}
