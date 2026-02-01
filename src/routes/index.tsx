import { useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Folder, ListTodo } from 'lucide-react'

import { CategoryCompletionIndicator } from '../components/CategoryCompletionIndicator'
import { CreationDrawer } from '../components/CreationDrawer'
import { Button } from '../components/ui/button'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export type ViewMode = 'day' | 'week' | 'month'

/** Current week Sunday–Saturday (en-US) as Date objects at local midnight */
function getCurrentWeekDates(): Array<Date> {
  const now = new Date()
  const day = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - day)
  start.setHours(0, 0, 0, 0)
  const dates: Array<Date> = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d)
  }
  return dates
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Current month as 6 weeks × 7 days (Sun–Sat). Cells are Date or null (other month). */
function getCurrentMonthGrid(): Array<Array<Date | null>> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const first = new Date(year, month, 1)
  const firstDay = first.getDay()
  const startOffset = firstDay
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const grid: Array<Array<Date | null>> = []
  let dayIndex = 1 - startOffset
  for (let row = 0; row < 6; row++) {
    const week: Array<Date | null> = []
    for (let col = 0; col < 7; col++) {
      if (dayIndex < 1 || dayIndex > daysInMonth) {
        week.push(null)
      } else {
        week.push(new Date(year, month, dayIndex))
      }
      dayIndex++
    }
    grid.push(week)
  }
  return grid
}

function WeekStrip() {
  const weekDates = useMemo(getCurrentWeekDates, [])
  const today = useMemo(() => new Date(), [])

  return (
    <section
      role="region"
      aria-label="Week"
      className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex min-w-0 gap-2">
        {weekDates.map((d) => {
          const isToday = isSameDay(d, today)
          return (
            <div
              key={d.toISOString()}
              className={`flex min-w-[4rem] flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 ${
                isToday
                  ? 'border-slate-500 bg-slate-700/80 text-slate-100'
                  : 'border-slate-800 bg-slate-950/60 text-slate-300'
              }`}
            >
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {d.getDate()}
              </span>
              {isToday ? (
                <span className="rounded bg-slate-600 px-2 py-0.5 text-xs font-medium text-slate-200">
                  Today
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function MonthGrid() {
  const grid = useMemo(getCurrentMonthGrid, [])
  const today = useMemo(() => new Date(), [])

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
          const isToday = isSameDay(d, today)
          return (
            <div
              key={d.toISOString()}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border p-1 ${
                isToday
                  ? 'border-slate-500 bg-slate-700/80 text-slate-100'
                  : 'border-slate-800 bg-slate-950/60 text-slate-300'
              }`}
            >
              <span className="text-sm font-medium tabular-nums">
                {d.getDate()}
              </span>
              {isToday ? (
                <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
                  Today
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export const Route = createFileRoute('/')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { view: ViewMode } => {
    const view = search.view
    if (view === 'week' || view === 'month') return { view }
    return { view: 'day' }
  },
  component: DailyView,
})

function DailyView() {
  const { view } = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<'categories'> | null>(null)
  const [draftNames, setDraftNames] = useState<Record<string, string>>({})
  const [editingTaskId, setEditingTaskId] = useState<Id<'tasks'> | null>(null)
  const [draftTaskTitles, setDraftTaskTitles] = useState<Record<string, string>>(
    {},
  )
  const [taskDeleteError, setTaskDeleteError] = useState<{
    id: Id<'tasks'>
    message: string
  } | null>(null)
  const [deleteError, setDeleteError] = useState<{
    id: Id<'categories'>
    message: string
  } | null>(null)
  const createCategory = useMutation(api.todos.createCategory)
  const createTask = useMutation(api.todos.createTask)
  const updateCategory = useMutation(api.todos.updateCategory)
  const updateTask = useMutation(api.todos.updateTask)
  const deleteCategory = useMutation(api.todos.deleteCategory)
  const deleteTask = useMutation(api.todos.deleteTask)
  const toggleTaskCompletion = useMutation(api.todos.toggleTaskCompletion)
  const categories = useQuery(api.todos.listCategories)
  const rootTasksDueToday = useQuery(api.todos.listRootTasksDueToday)
  const rootTasksDueInWeek = useQuery(api.todos.listRootTasksDueInWeek)
  const rootTasksDueInMonth = useQuery(api.todos.listRootTasksDueInMonth)
  const rootTasks =
    view === 'week'
      ? rootTasksDueInWeek
      : view === 'month'
        ? rootTasksDueInMonth
        : rootTasksDueToday

  const handleAddCategory = async (params: {
    name: string
    parentCategoryId?: Id<'categories'>
    color?: string
  }) => {
    await createCategory({
      name: params.name,
      parentCategoryId: params.parentCategoryId,
      color: params.color,
    })
    setDrawerOpen(false)
  }

  const handleAddTask = async (params: {
    title: string
    parentCategoryId?: Id<'categories'>
    repeatEnabled?: boolean
    frequency?: 'daily' | 'bi-daily' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | '6-monthly' | 'yearly'
  }) => {
    await createTask({
      title: params.title,
      parentCategoryId: params.parentCategoryId,
      repeatEnabled: params.repeatEnabled,
      frequency: params.frequency,
    })
    setDrawerOpen(false)
  }

  const startEditing = (id: Id<'categories'>, currentName: string) => {
    setEditingId(id)
    setDeleteError((current) => (current?.id === id ? null : current))
    setDraftNames((prev) => ({
      ...prev,
      [id]: currentName,
    }))
  }

  const cancelEditing = (id: Id<'categories'>) => {
    setEditingId((current) => (current === id ? null : current))
    setDraftNames((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const saveEditing = async (
    id: Id<'categories'>,
    currentName: string,
  ) => {
    const trimmed = (draftNames[id] ?? '').trim()
    if (!trimmed || trimmed === currentName) {
      cancelEditing(id)
      return
    }
    await updateCategory({ id, name: trimmed })
    cancelEditing(id)
  }

  const handleDelete = async (id: Id<'categories'>) => {
    setDeleteError(null)
    try {
      await deleteCategory({ id })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to delete category.'
      setDeleteError({ id, message })
    }
  }

  const startTaskEditing = (id: Id<'tasks'>, currentTitle: string) => {
    setEditingTaskId(id)
    setTaskDeleteError((current) => (current?.id === id ? null : current))
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
    await updateTask({ id, title: trimmed })
    cancelTaskEditing(id)
  }

  const handleTaskDelete = async (id: Id<'tasks'>) => {
    setTaskDeleteError(null)
    try {
      await deleteTask({ id })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to delete task.'
      setTaskDeleteError({ id, message })
    }
  }

  const handleTaskToggle = async (id: Id<'tasks'>) => {
    await toggleTaskCompletion({ id })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
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
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  view === mode
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
                ? `Today - ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}`
                : view === 'week'
                  ? 'Weekly'
                  : 'Monthly'}
            </p>
            <h1 className="text-4xl font-semibold text-slate-100">
              Categories
            </h1>
            <p className="text-base text-slate-400">
              Create a root category to organize today.
            </p>
          </div>
        </header>

        {view === 'week' ? (
          <WeekStrip />
        ) : view === 'month' ? (
          <MonthGrid />
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            onClick={() => setDrawerOpen(true)}
          >
            Create
          </Button>
          <CreationDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            onAddCategory={handleAddCategory}
            onAddTask={handleAddTask}
            title="Create category or task"
          />
        </div>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Folder className="size-5 shrink-0 text-slate-400" strokeWidth={1.5} aria-hidden />
            Your categories
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            {categories === undefined ? (
              <p className="text-sm text-slate-500">Loading categories...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-slate-500">No categories yet.</p>
            ) : (
              <ul className="space-y-2">
                {categories.map((category) => {
                  const draftName = draftNames[category._id] ?? ''
                  const showDeleteError = deleteError?.id === category._id
                  return (
                    <li
                      key={category._id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
                    >
                      {editingId === category._id ? (
                        <>
                          <input
                            type="text"
                            value={draftName}
                            onChange={(event) =>
                              setDraftNames((prev) => ({
                                ...prev,
                                [category._id]: event.target.value,
                              }))
                            }
                            className="h-9 flex-1 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              className="h-9 px-4"
                              disabled={
                                !draftName.trim() ||
                                draftName.trim() === category.name
                              }
                              onClick={() =>
                                saveEditing(category._id, category.name)
                              }
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 px-4"
                              onClick={() => cancelEditing(category._id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Folder className="size-5 shrink-0 text-slate-500" strokeWidth={1.5} aria-hidden />
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <Link
                              to="/categories/$categoryId"
                              params={{ categoryId: category._id }}
                              className="truncate text-left text-slate-100 hover:text-slate-200"
                            >
                              {category.name}
                            </Link>
                            <CategoryCompletionIndicator
                              categoryId={category._id}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 px-4"
                              onClick={() =>
                                startEditing(category._id, category.name)
                              }
                            >
                              Rename
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="h-9 px-4"
                              onClick={() => handleDelete(category._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                      {showDeleteError ? (
                        <p className="w-full text-xs text-rose-300">
                          {deleteError.message}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

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
              <p className="text-sm text-slate-500">Loading tasks...</p>
            ) : rootTasks.length === 0 ? (
              <p className="text-sm text-slate-500">
                {view === 'day'
                  ? 'No tasks due today.'
                  : view === 'week'
                    ? 'No tasks due this week.'
                    : 'No tasks due this month.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {rootTasks.map((task) => {
                  const draftTitle = draftTaskTitles[task._id] ?? ''
                  const showTaskDeleteError = taskDeleteError?.id === task._id
                  return (
                    <li
                      key={task._id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
                    >
                      {editingTaskId === task._id ? (
                        <>
                          <input
                            type="text"
                            value={draftTitle}
                            onChange={(event) =>
                              setDraftTaskTitles((prev) => ({
                                ...prev,
                                [task._id]: event.target.value,
                              }))
                            }
                            className="h-9 flex-1 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              className="h-9 px-4"
                              disabled={
                                !draftTitle.trim() ||
                                draftTitle.trim() === task.title
                              }
                              onClick={() =>
                                saveTaskEditing(task._id, task.title)
                              }
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 px-4"
                              onClick={() => cancelTaskEditing(task._id)}
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
                              checked={task.isCompleted}
                              onChange={() => handleTaskToggle(task._id)}
                              aria-label={`Mark ${task.title} complete`}
                            />
                            <span
                              className={`flex-1 ${
                                task.isCompleted
                                  ? 'text-slate-500 line-through'
                                  : ''
                              }`}
                            >
                              {task.title}
                            </span>
                          </label>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 px-4"
                              onClick={() =>
                                startTaskEditing(task._id, task.title)
                              }
                            >
                              Rename
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="h-9 px-4"
                              onClick={() => handleTaskDelete(task._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                      {showTaskDeleteError ? (
                        <p className="w-full text-xs text-rose-300">
                          {taskDeleteError.message}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
