import { Link } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'

import type { Id } from '../../convex/_generated/dataModel'
import { Button } from './ui/button'

export function TaskRow({
  task,
  editingTaskId,
  draftTitle,
  setDraftTitle,
  isCompleted,
  subtaskCompletion,
  celebratingTaskId,
  startEditing,
  saveEditing,
  cancelEditing,
  handleDelete,
  handleComplete,
  dateSearch,
}: {
  task: { _id: Id<'tasks'>; title: string }
  editingTaskId: Id<'tasks'> | null
  draftTitle: string
  setDraftTitle: (value: string) => void
  isCompleted: boolean
  subtaskCompletion?: { total: number; completed: number }
  celebratingTaskId: Id<'tasks'> | null
  startEditing: (id: Id<'tasks'>, currentTitle: string) => void
  saveEditing: (id: Id<'tasks'>, currentTitle: string) => void
  cancelEditing: (id: Id<'tasks'>) => void
  handleDelete: (id: Id<'tasks'>) => void
  handleComplete: (id: Id<'tasks'>, currentCompleted: boolean) => void
  dateSearch?: string
}) {
  const taskLinkSearch = dateSearch ? { date: dateSearch } : undefined
  const showSubtaskCompletion =
    subtaskCompletion && subtaskCompletion.total > 0
  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/70 px-4 py-3 text-sm text-foreground ${
        celebratingTaskId === task._id ? 'animate-completion-bounce' : ''
      }`}
    >
      {editingTaskId === task._id ? (
        <>
          <input
            type="text"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-background/70 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            aria-label="Rename task"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="h-9 px-4"
              disabled={!draftTitle.trim() || draftTitle.trim() === task.title}
              onClick={() => saveEditing(task._id, task.title)}
              aria-label="Save task title"
            >
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-4"
              onClick={() => cancelEditing(task._id)}
              aria-label="Cancel renaming task"
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <label className="flex flex-1 items-center gap-3">
            <input
              type="checkbox"
              className="h-6 w-6 rounded-full border-2 border-input bg-background text-foreground accent-primary appearance-none checked:bg-primary checked:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              checked={isCompleted}
              onChange={() => handleComplete(task._id, isCompleted)}
              aria-label={`Mark ${task.title} complete`}
            />
            <Link
              to="/tasks/$taskId"
              params={{ taskId: task._id }}
              search={taskLinkSearch}
              className={`flex-1 truncate text-left ${
                isCompleted
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              }`}
            >
              {task.title}
            </Link>
          </label>
          {showSubtaskCompletion ? (
            <span className="rounded-full border border-border bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
              {subtaskCompletion.completed}/{subtaskCompletion.total} subtasks
            </span>
          ) : null}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => startEditing(task._id, task.title)}
              aria-label={`Rename task ${task.title}`}
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleDelete(task._id)}
              aria-label={`Delete task ${task.title}`}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        </>
      )}
    </li>
  )
}
