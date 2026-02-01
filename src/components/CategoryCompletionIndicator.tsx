import { useQuery } from 'convex/react'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

type CategoryCompletionIndicatorProps = {
  categoryId: Id<'categories'>
}

export function CategoryCompletionIndicator({
  categoryId,
}: CategoryCompletionIndicatorProps) {
  const children = useQuery(api.todos.listCategoryChildren, { id: categoryId })

  if (!children || children.tasks.length === 0) {
    return null
  }

  const total = children.tasks.length
  const completed = children.tasks.filter((task) => task.isCompleted).length
  const progress = Math.min(100, Math.round((completed / total) * 100))
  const isPartial = completed < total

  return (
    <div
      className="flex items-center gap-3 text-xs text-slate-400"
      data-testid="category-completion"
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
      {isPartial ? (
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-amber-200">
          Partial
        </span>
      ) : null}
    </div>
  )
}
