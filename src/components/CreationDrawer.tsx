import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer'
import type { Id } from '../../convex/_generated/dataModel'

export type TaskFrequency =
  | 'daily'
  | 'bi-daily'
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | '6-monthly'
  | 'yearly'

const FREQUENCY_OPTIONS: Array<{ value: TaskFrequency; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'bi-daily', label: 'Every 2 days' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: '6-monthly', label: 'Every 6 months' },
  { value: 'yearly', label: 'Yearly' },
]

export type AddTaskParams = {
  title: string
  parentTaskId?: Id<'tasks'>
  dueDate?: number
  frequency?: TaskFrequency
}

/** Format Date as YYYY-MM-DD for input[type="date"]. */
function toDateInputValue(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse YYYY-MM-DD to UTC start-of-day ms. */
function parseDateToUTCStartMs(s: string): number {
  const [y, m = 1, d = 1] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

type CreationDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, new tasks are created under this task; when null, root. */
  parentTaskId?: Id<'tasks'> | null
  /** Read-only parent name shown when parentTaskId provided. */
  parentTaskTitle?: string
  onAddTask: (params: AddTaskParams) => Promise<void>
  /** Title shown in drawer header. */
  title?: string
  /** Default due date for new tasks (e.g. selected day on index). */
  defaultDueDate?: Date
}

export function CreationDrawer({
  open,
  onOpenChange,
  parentTaskId,
  parentTaskTitle,
  onAddTask,
  title = 'Create task',
  defaultDueDate,
}: CreationDrawerProps) {
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueDate, setTaskDueDate] = useState<string>('')
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [taskFrequency, setTaskFrequency] = useState<TaskFrequency | ''>('daily')
  const showParentInfo = parentTaskId != null

  useEffect(() => {
    if (open) {
      setTaskDueDate(
        toDateInputValue(defaultDueDate ?? new Date()),
      )
    }
  }, [open, parentTaskId, defaultDueDate])

  const handleTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = taskTitle.trim()
    if (!trimmed) return
    await onAddTask({
      title: trimmed,
      parentTaskId: showParentInfo ? parentTaskId : undefined,
      dueDate: taskDueDate ? parseDateToUTCStartMs(taskDueDate) : undefined,
      frequency: repeatEnabled && taskFrequency ? taskFrequency : undefined,
    })
    setTaskTitle('')
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent
        className="border-border bg-card"
        role="dialog"
        aria-label={title}
      >
        <DrawerHeader>
          <DrawerTitle className="text-foreground">{title}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-6 px-4 pb-4">
          <form
            onSubmit={handleTaskSubmit}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-4"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Task title
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Pay rent, Call mom"
                className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                aria-label="Task title"
              />
            </div>
            {showParentInfo ? (
              <div>
                <label
                  htmlFor="task-parent"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"
                >
                  Parent task
                </label>
                <input
                  id="task-parent"
                  type="text"
                  value={parentTaskTitle ?? 'Selected task'}
                  readOnly
                  disabled
                  className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground opacity-80"
                  aria-label="Parent task"
                />
              </div>
            ) : null}
            <div>
              <label
                htmlFor="task-due-date"
                className="mb-2 block text-sm font-medium text-muted-foreground"
              >
                Due date
              </label>
              <input
                type="date"
                id="task-due-date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground focus:border-ring focus:outline-none"
                aria-label="Due date"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="task-repeat"
                checked={repeatEnabled}
                onChange={(e) => setRepeatEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-input bg-background text-foreground accent-primary"
                aria-label="Repeat task"
              />
              <label
                htmlFor="task-repeat"
                className="text-sm font-medium text-muted-foreground"
              >
                Repeat
              </label>
            </div>
            {repeatEnabled && (
              <div>
                <label
                  htmlFor="task-frequency"
                  className="mb-2 block text-sm font-medium text-muted-foreground"
                >
                  Frequency
                </label>
                <select
                  id="task-frequency"
                  value={taskFrequency}
                  onChange={(e) =>
                    setTaskFrequency(e.target.value as TaskFrequency)
                  }
                  className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground focus:border-ring focus:outline-none"
                  aria-label="Repeat frequency"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button
              type="submit"
              className="h-10 w-full px-6 sm:w-auto"
              disabled={!taskTitle.trim()}
            >
              Add task
            </Button>
          </form>
        </div>
        <DrawerFooter className="flex-row justify-end border-t border-border pt-4">
          <DrawerClose asChild>
            <Button variant="secondary" aria-label="Close drawer">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
