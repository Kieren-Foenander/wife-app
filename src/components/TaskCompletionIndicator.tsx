import { useQuery } from 'convex/react'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

type TaskCompletionIndicatorProps = {
  taskId: Id<'tasks'>
  completionOverride?: { total: number; completed: number }
}

export function TaskCompletionIndicator({
  taskId,
  completionOverride,
}: TaskCompletionIndicatorProps) {
  const completionFromQuery = useQuery(api.todos.getTaskCompletion, { taskId })
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
      className="flex items-center gap-3 text-xs text-slate-400"
      data-testid="task-completion"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${completed} of ${total} tasks completed`}
    >
      <div className="h-1 w-20 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-400/80"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="whitespace-nowrap">
        {completed}/{total} done
      </span>
      {isComplete ? (
        <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
          Completed
        </span>
      ) : isPartial ? (
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-amber-200">
          Partial
        </span>
      ) : null}
    </div>
  )
}
