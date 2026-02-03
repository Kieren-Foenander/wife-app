import { ListTodo } from 'lucide-react'

import type { Id } from '../../convex/_generated/dataModel'
import { Button } from './ui/button'

export function TaskRow({
  task,
  editingTaskId,
  draftTitle,
  setDraftTitle,
  isCompleted,
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
  celebratingTaskId: Id<'tasks'> | null
  startEditing: (id: Id<'tasks'>, currentTitle: string) => void
  saveEditing: (id: Id<'tasks'>, currentTitle: string) => void
  cancelEditing: (id: Id<'tasks'>) => void
  handleDelete: (id: Id<'tasks'>) => void
  handleComplete: (id: Id<'tasks'>, currentCompleted: boolean) => void
  dateSearch?: string
}) {
  const taskHref = dateSearch
    ? `/tasks/${task._id}?date=${dateSearch}`
    : `/tasks/${task._id}`
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
          <ListTodo
            className="size-5 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden
          />
          <label className="flex flex-1 items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input bg-background text-foreground accent-primary"
              checked={isCompleted}
              onChange={() => handleComplete(task._id, isCompleted)}
              aria-label={`Mark ${task.title} complete`}
            />
            <a
              href={taskHref}
              className={`flex-1 truncate text-left ${
                isCompleted
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              }`}
            >
              {task.title}
            </a>
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-4"
              onClick={() => startEditing(task._id, task.title)}
              aria-label={`Rename task ${task.title}`}
            >
              Rename
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9 px-4"
              onClick={() => handleDelete(task._id)}
              aria-label={`Delete task ${task.title}`}
            >
              Delete
            </Button>
          </div>
        </>
      )}
    </li>
  )
}
