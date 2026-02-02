import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ClipboardList, ListTodo } from 'lucide-react'
import { toast } from 'sonner'

import { CreationDrawer } from '../components/CreationDrawer'
import { Button } from '../components/ui/button'
import { ListRowSkeleton } from '../components/ui/skeleton'
import { Spinner } from '../components/ui/spinner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export type ViewMode = 'day' | 'week' | 'month'

/** Format date as YYYY-MM-DD (UTC). */
function toYYYYMMDDUTC(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse YYYY-MM-DD to Date at midnight UTC. */
function fromYYYYMMDD(s: string): Date {
  const [y, m = 1, d = 1] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** UTC start-of-day ms for a Date (uses UTC date parts). */
function startOfDayUTCFromDate(d: Date): number {
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
  )
}

/** Week Sunday–Saturday (en-US) containing the given date; dates at midnight UTC. */
function getWeekDatesFor(selectedDate: Date): Array<Date> {
  const d = new Date(selectedDate)
  const day = d.getUTCDay()
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day))
  const dates: Array<Date> = []
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(start.getTime() + i * 24 * 60 * 60 * 1000))
  }
  return dates
}

/** Month grid (6×7) for the given date; cells are Date (midnight UTC) or null. */
function getMonthGridFor(selectedDate: Date): Array<Array<Date | null>> {
  const year = selectedDate.getUTCFullYear()
  const month = selectedDate.getUTCMonth()
  const first = new Date(Date.UTC(year, month, 1))
  const firstDay = first.getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const grid: Array<Array<Date | null>> = []
  let dayIndex = 1 - firstDay
  for (let row = 0; row < 6; row++) {
    const week: Array<Date | null> = []
    for (let col = 0; col < 7; col++) {
      if (dayIndex < 1 || dayIndex > daysInMonth) {
        week.push(null)
      } else {
        week.push(new Date(Date.UTC(year, month, dayIndex)))
      }
      dayIndex++
    }
    grid.push(week)
  }
  return grid
}

function WeekStrip({
  selectedDate,
  onSelectDay,
}: {
  selectedDate: Date
  onSelectDay: (d: Date) => void
}) {
  const weekDates = useMemo(
    () => getWeekDatesFor(selectedDate),
    [selectedDate],
  )
  const todayUTC = useMemo(
    () =>
      new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
        ),
      ),
    [],
  )

  return (
    <section
      role="region"
      aria-label="Week"
      className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex min-w-0 gap-2">
        {weekDates.map((d) => {
          const isToday =
            d.getUTCFullYear() === todayUTC.getUTCFullYear() &&
            d.getUTCMonth() === todayUTC.getUTCMonth() &&
            d.getUTCDate() === todayUTC.getUTCDate()
          const isSelected =
            d.getTime() === startOfDayUTCFromDate(selectedDate)
          return (
            <button
              type="button"
              key={d.toISOString()}
              onClick={() => onSelectDay(d)}
              className={`flex min-w-[4rem] flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-colors ${isSelected
                ? 'border-slate-500 bg-slate-700/80 text-slate-100 ring-2 ring-slate-400'
                : isToday
                  ? 'border-slate-500 bg-slate-700/60 text-slate-100 hover:bg-slate-700/80'
                  : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/60'
                }`}
              aria-label={d.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
              aria-pressed={isSelected}
            >
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {d.getUTCDate()}
              </span>
              {isToday ? (
                <span className="rounded bg-slate-600 px-2 py-0.5 text-xs font-medium text-slate-200">
                  Today
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function MonthGrid({
  selectedDate,
  onSelectDay,
}: {
  selectedDate: Date
  onSelectDay: (d: Date) => void
}) {
  const grid = useMemo(
    () => getMonthGridFor(selectedDate),
    [selectedDate],
  )
  const todayUTC = useMemo(
    () =>
      new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
        ),
      ),
    [],
  )

  return (
    <section
      role="region"
      aria-label="Month"
      className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="grid min-w-0 grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            {label}
          </div>
        ))}
        {grid.flat().map((d, i) => {
          if (d === null) {
            return (
              <div
                key={`empty-${i}`}
                className="aspect-square rounded-lg border border-slate-800/60 bg-slate-950/40 p-1 text-slate-600"
              />
            )
          }
          const isToday =
            d.getUTCFullYear() === todayUTC.getUTCFullYear() &&
            d.getUTCMonth() === todayUTC.getUTCMonth() &&
            d.getUTCDate() === todayUTC.getUTCDate()
          const isSelected = d.getTime() === startOfDayUTCFromDate(selectedDate)
          return (
            <button
              type="button"
              key={d.toISOString()}
              onClick={() => onSelectDay(d)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border p-1 transition-colors ${isSelected
                ? 'border-slate-500 bg-slate-700/80 text-slate-100 ring-2 ring-slate-400'
                : isToday
                  ? 'border-slate-500 bg-slate-700/60 text-slate-100 hover:bg-slate-700/80'
                  : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/60'
                }`}
              aria-label={d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
              aria-pressed={isSelected}
            >
              <span className="text-sm font-medium tabular-nums">
                {d.getUTCDate()}
              </span>
              {isToday ? (
                <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
                  Today
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function TaskRow({
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
}) {
  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 ${celebratingTaskId === task._id ? 'animate-completion-bounce' : ''
        }`}
    >
      {editingTaskId === task._id ? (
        <>
          <input
            type="text"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            className="h-9 flex-1 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
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
          <ListTodo className="size-5 shrink-0 text-slate-500" strokeWidth={1.5} aria-hidden />
          <label className="flex flex-1 items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-slate-100 accent-slate-200"
              checked={isCompleted}
              onChange={() => handleComplete(task._id, isCompleted)}
              aria-label={`Mark ${task.title} complete`}
            />
            <a
              href={`/tasks/${task._id}`}
              className={`flex-1 truncate text-left ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-100'
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

export const Route = createFileRoute('/')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): {
    view: ViewMode
    date?: string
  } => {
    const view = search.view
    const viewMode: ViewMode =
      view === 'week' || view === 'month' ? view : 'day'
    const date =
      typeof search.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : undefined
    return { view: viewMode, date }
  },
  component: DailyView,
})

function DailyView() {
  const { view, date: dateStr } = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const selectedDate = useMemo(
    () =>
      dateStr ? fromYYYYMMDD(dateStr) : fromYYYYMMDD(toYYYYMMDDUTC(new Date())),
    [dateStr],
  )
  const dayStartMs = useMemo(
    () => startOfDayUTCFromDate(selectedDate),
    [selectedDate],
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<Id<'tasks'> | null>(null)
  const [draftTaskTitles, setDraftTaskTitles] = useState<Record<string, string>>(
    {},
  )
  const [taskCompletionOverrides, setTaskCompletionOverrides] = useState<
    Partial<Record<string, boolean>>
  >({})
  const [celebratingTaskId, setCelebratingTaskId] =
    useState<Id<'tasks'> | null>(null)
  const createTask = useMutation(api.todos.createTask)
  const updateTask = useMutation(api.todos.updateTask)
  const deleteTask = useMutation(api.todos.deleteTask)
  const setTaskCompletion = useMutation(api.todos.setTaskCompletion)
  const rootTasksDueOnDate = useQuery(api.todos.listRootTasksDueOnDate, {
    dayStartMs,
  })
  const rootTasksDueInWeek = useQuery(api.todos.listRootTasksDueInWeek, {
    refDateMs: selectedDate.getTime(),
  })
  const rootTasksDueInMonth = useQuery(api.todos.listRootTasksDueInMonth, {
    refDateMs: selectedDate.getTime(),
  })
  const rootTasks =
    view === 'week'
      ? rootTasksDueInWeek
      : view === 'month'
        ? rootTasksDueInMonth
        : rootTasksDueOnDate

  const handleAddTask = async (params: {
    title: string
    parentTaskId?: Id<'tasks'>
    dueDate?: number
    frequency?:
    | 'daily'
    | 'bi-daily'
    | 'weekly'
    | 'fortnightly'
    | 'monthly'
    | 'quarterly'
    | '6-monthly'
    | 'yearly'
  }) => {
    try {
      await createTask({
        title: params.title,
        parentTaskId: params.parentTaskId,
        dueDate: params.dueDate,
        frequency: params.frequency,
      })
      setDrawerOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create task.',
      )
    }
  }

  const startTaskEditing = (id: Id<'tasks'>, currentTitle: string) => {
    setEditingTaskId(id)
    setDraftTaskTitles((prev) => ({
      ...prev,
      [id]: currentTitle,
    }))
  }

  const cancelTaskEditing = (id: Id<'tasks'>) => {
    setEditingTaskId((current) => (current === id ? null : current))
    setDraftTaskTitles((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const saveTaskEditing = async (
    id: Id<'tasks'>,
    currentTitle: string,
  ) => {
    const trimmed = (draftTaskTitles[id] ?? '').trim()
    if (!trimmed || trimmed === currentTitle) {
      cancelTaskEditing(id)
      return
    }
    try {
      await updateTask({ id, title: trimmed })
      cancelTaskEditing(id)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to rename task.',
      )
    }
  }

  const handleTaskDelete = async (id: Id<'tasks'>) => {
    try {
      await deleteTask({ id })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete task.',
      )
    }
  }

  const handleTaskToggle = async (
    id: Id<'tasks'>,
    currentCompleted: boolean,
  ) => {
    const nextCompleted = !currentCompleted
    if (nextCompleted) {
      setCelebratingTaskId(id)
      setTimeout(() => setCelebratingTaskId(null), 500)
    }
    setTaskCompletionOverrides((prev) => ({
      ...prev,
      [id]: nextCompleted,
    }))
    try {
      await setTaskCompletion({ taskId: id, completed: nextCompleted })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update task.',
      )
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main id="main-content" className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16" aria-label="Daily view">
        <header className="space-y-4">
          <div
            className="inline-flex rounded-xl border border-slate-800 bg-slate-900/60 p-1"
            role="tablist"
            aria-label="View mode"
          >
            {(['day', 'week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={view === mode}
                onClick={() => navigate({ search: { view: mode } })}
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${view === mode
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {mode === 'day' ? 'Day' : mode === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
              {view === 'day'
                ? toYYYYMMDDUTC(selectedDate) === toYYYYMMDDUTC(new Date())
                  ? `Today - ${selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}`
                  : selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : view === 'week'
                  ? 'Weekly'
                  : 'Monthly'}
            </p>
            <h1 className="text-4xl font-semibold text-slate-100">
              Tasks
            </h1>
            <p className="text-base text-slate-400">
              Create a root task to organize today.
            </p>
          </div>
        </header>

        {view === 'week' ? (
          <WeekStrip
            selectedDate={selectedDate}
            onSelectDay={(d) =>
              navigate({
                search: {
                  view: 'day',
                  date: toYYYYMMDDUTC(d),
                },
              })
            }
          />
        ) : view === 'month' ? (
          <MonthGrid
            selectedDate={selectedDate}
            onSelectDay={(d) =>
              navigate({
                search: {
                  view: 'day',
                  date: toYYYYMMDDUTC(d),
                },
              })
            }
          />
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open create drawer to add task"
          >
            Add task
          </Button>
          <CreationDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            onAddTask={handleAddTask}
            title="Add task"
            defaultDueDate={selectedDate}
          />
        </div>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <ListTodo className="size-5 shrink-0 text-slate-400" strokeWidth={1.5} aria-hidden />
            {view === 'day'
              ? 'Your tasks'
              : view === 'week'
                ? 'Tasks due this week'
                : 'Tasks due this month'}
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            {rootTasks === undefined ? (
              <div className="flex flex-col items-center gap-4 py-8" role="status" aria-label="Loading tasks">
                <Spinner aria-label="Loading tasks" size={24} />
                <p className="text-sm text-slate-500">Loading tasks...</p>
                <ul className="w-full space-y-2">
                  {[1, 2, 3].map((i) => (
                    <ListRowSkeleton key={i} />
                  ))}
                </ul>
              </div>
            ) : rootTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center" role="status" aria-label="No tasks">
                <ClipboardList className="size-12 text-slate-600" strokeWidth={1.25} aria-hidden />
                <div className="space-y-1">
                  <p className="text-base font-medium text-slate-300">
                    {view === 'day'
                      ? 'No tasks due today'
                      : view === 'week'
                        ? 'No tasks due this week'
                        : 'No tasks due this month'}
                  </p>
                  <p className="text-sm text-slate-500">
                    Add a task to see it here.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {rootTasks.map((task) => {
                  const draftTitle = draftTaskTitles[task._id] ?? ''
                  const isCompleted =
                    taskCompletionOverrides[task._id] ?? task.isCompleted
                  return (
                    <TaskRow
                      key={task._id}
                      task={task}
                      editingTaskId={editingTaskId}
                      draftTitle={draftTitle}
                      setDraftTitle={(value) =>
                        setDraftTaskTitles((prev) => ({
                          ...prev,
                          [task._id]: value,
                        }))
                      }
                      isCompleted={isCompleted}
                      celebratingTaskId={celebratingTaskId}
                      startEditing={startTaskEditing}
                      saveEditing={saveTaskEditing}
                      cancelEditing={cancelTaskEditing}
                      handleDelete={handleTaskDelete}
                      handleComplete={handleTaskToggle}
                    />
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
