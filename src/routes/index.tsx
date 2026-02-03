import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ClipboardList, ListTodo } from 'lucide-react'
import { toast } from 'sonner'

import { CreationDrawer } from '../components/CreationDrawer'
import { MonthGrid } from '../components/MonthGrid'
import { TaskRow } from '../components/TaskRow'
import { WeekStrip } from '../components/WeekStrip'
import {
  addDaysUTC,
  addMonthsUTC,
  fromYYYYMMDD,
  getWeekDatesFor,
  startOfDayUTCFromDate,
  toYYYYMMDDUTC,
} from '../lib/dateUtils'
import { Button } from '../components/ui/button'
import { ListRowSkeleton } from '../components/ui/skeleton'
import { Spinner } from '../components/ui/spinner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/')({
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
  component: DailyView,
})

function DailyView() {
  const { date: dateStr } = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const selectedDate = dateStr
    ? fromYYYYMMDD(dateStr)
    : fromYYYYMMDD(toYYYYMMDDUTC(new Date()))
  const dayStartMs = startOfDayUTCFromDate(selectedDate)
  const [rangeMode, setRangeMode] = useState<'week' | 'month'>('week')
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
  const rootTasks = rootTasksDueOnDate ?? []
  const todayStartMs = startOfDayUTCFromDate(new Date())
  const isSelectedToday = dayStartMs === todayStartMs

  useEffect(() => {
    setTaskCompletionOverrides({})
  }, [dayStartMs])

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
      await setTaskCompletion({
        taskId: id,
        completed: nextCompleted,
        completedDateMs: dayStartMs,
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update task.',
      )
    }
  }

  const handleSelectDay = (d: Date) => {
    navigate({
      search: {
        date:
          startOfDayUTCFromDate(d) === todayStartMs
            ? undefined
            : toYYYYMMDDUTC(d),
      },
    })
  }

  const handleResetToday = () => {
    navigate({
      search: {
        date: undefined,
      },
    })
  }

  const handleShiftRange = (direction: 'prev' | 'next') => {
    const delta = direction === 'prev' ? -1 : 1
    const nextDate =
      rangeMode === 'month'
        ? addMonthsUTC(selectedDate, delta)
        : addDaysUTC(selectedDate, 7 * delta)
    handleSelectDay(nextDate)
  }

  const rangeLabel =
    rangeMode === 'month'
      ? selectedDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
      : (() => {
        const weekStart = getWeekDatesFor(selectedDate)[0]
        return `Week of ${weekStart.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}`
      })()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 pb-32 pt-4"
        aria-label="Daily view"
      >
        <header className="space-y-4">
          <p className="text-center text-xl font-semibold text-muted-foreground">
            Wife App
          </p>
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              {isSelectedToday
                ? `Today - ${selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                })}`
                : selectedDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
            </p>
            <h1 className="text-4xl font-semibold text-foreground">
              Tasks
            </h1>
            <p className="text-base text-muted-foreground">
              Create a root task to organize today.
            </p>
          </div>
        </header>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3">

            <div className="flex rounded-full border border-border p-1">
              {(['week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRangeMode(mode)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${rangeMode === mode
                    ? 'bg-primary/20 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                  aria-pressed={rangeMode === mode}
                >
                  {mode}
                </button>
              ))}
            </div>
            <span className="text-sm font-semibold text-foreground">
              {rangeLabel}
            </span>
            <div className="flex items-center w-full justify-between gap-2">
              <button
                type="button"
                onClick={() => handleShiftRange('prev')}
                className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                aria-label={
                  rangeMode === 'month' ? 'Previous month' : 'Previous week'
                }
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => handleShiftRange('next')}
                className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                aria-label={rangeMode === 'month' ? 'Next month' : 'Next week'}
              >
                Next
              </button>
            </div>

          </div>
          {rangeMode === 'month' ? (
            <MonthGrid
              selectedDate={selectedDate}
              onSelectDay={handleSelectDay}
            />
          ) : (
            <WeekStrip
              selectedDate={selectedDate}
              onSelectDay={handleSelectDay}
            />
          )}
        </section>

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
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ListTodo className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            Your tasks
          </h2>
          <div className="rounded-2xl border border-border bg-card/70 p-6">
            {rootTasksDueOnDate === undefined ? (
              <div className="flex flex-col items-center gap-4 py-8" role="status" aria-label="Loading tasks">
                <Spinner aria-label="Loading tasks" size={24} />
                <p className="text-sm text-muted-foreground">Loading tasks...</p>
                <ul className="w-full space-y-2">
                  {[1, 2, 3].map((i) => (
                    <ListRowSkeleton key={i} />
                  ))}
                </ul>
              </div>
            ) : rootTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center" role="status" aria-label="No tasks">
                <ClipboardList className="size-12 text-muted-foreground" strokeWidth={1.25} aria-hidden />
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">
                    No tasks due on this day
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Add a task to see it here.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-6">
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
      {!isSelectedToday ? (
        <Button
          type="button"
          className="fixed top-24 right-6 z-20 h-12 rounded-full px-5 text-base shadow-lg"
          onClick={handleResetToday}
          aria-label="Jump to today"
        >
          Jump to Today
        </Button>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur">
        <div
          className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-6 py-3"
          role="navigation"
          aria-label="Primary"
        >
          <a
            href="/"
            className="flex-1 rounded-full bg-primary/20 px-3 py-2 text-center text-sm font-semibold uppercase tracking-wide text-foreground shadow-sm"
            aria-current="page"
          >
            Home
          </a>
          {['Calendar', 'Insights'].map((label) => (
            <button
              key={label}
              type="button"
              className="flex-1 cursor-not-allowed rounded-full px-3 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
              aria-disabled="true"
              tabIndex={-1}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
