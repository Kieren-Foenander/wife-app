import { useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ClipboardList, ListTodo } from 'lucide-react'
import { toast } from 'sonner'

import { CreationDrawer } from '../../components/CreationDrawer'
import { Button } from '../../components/ui/button'
import { ListRowSkeleton } from '../../components/ui/skeleton'
import { Spinner } from '../../components/ui/spinner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { TaskCompletionIndicator } from '../../components/TaskCompletionIndicator'

export const Route = createFileRoute('/tasks/$taskId')({
  ssr: false,
  component: TaskDetail,
})

function TaskDetail() {
  const { taskId } = Route.useParams()
  const task = useQuery(api.todos.getTask, { id: taskId as Id<'tasks'> })
  const ancestors = useQuery(api.todos.listTaskAncestors, {
    taskId: taskId as Id<'tasks'>,
  })
  const children = useQuery(api.todos.listTaskChildren, {
    taskId: taskId as Id<'tasks'>,
  })
  const completion = useQuery(api.todos.getTaskCompletion, {
    taskId: taskId as Id<'tasks'>,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<Id<'tasks'> | null>(null)
  const [draftTitles, setDraftTitles] = useState<Record<string, string>>({})
  const [taskCompletionOverrides, setTaskCompletionOverrides] = useState<
    Record<string, boolean>
  >({})
  const [celebratingTaskId, setCelebratingTaskId] =
    useState<Id<'tasks'> | null>(null)
  const [isCompletingAll, setIsCompletingAll] = useState(false)
  const createTask = useMutation(api.todos.createTask)
  const updateTask = useMutation(api.todos.updateTask)
  const deleteTask = useMutation(api.todos.deleteTask)
  const completeTaskAndSubtasks = useMutation(api.todos.completeTaskAndSubtasks)

  const effectiveCompletion = useMemo(() => {
    if (!completion) return undefined
    const overrideCount = Object.values(taskCompletionOverrides).filter(Boolean)
      .length
    if (overrideCount === 0) return completion
    return {
      total: completion.total,
      completed: Math.min(completion.total, completion.completed + overrideCount),
    }
  }, [completion, taskCompletionOverrides])

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
        parentTaskId: params.parentTaskId ?? (taskId as Id<'tasks'>),
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
    setDraftTitles((prev) => ({
      ...prev,
      [id]: currentTitle,
    }))
  }

  const cancelTaskEditing = (id: Id<'tasks'>) => {
    setEditingTaskId((current) => (current === id ? null : current))
    setDraftTitles((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const saveTaskEditing = async (id: Id<'tasks'>, currentTitle: string) => {
    const trimmed = (draftTitles[id] ?? '').trim()
    if (!trimmed || trimmed === currentTitle) {
      cancelTaskEditing(id)
      return
    }
    try {
      await updateTask({ id, title: trimmed })
      cancelTaskEditing(id)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update task.',
      )
    }
  }

  const handleDeleteTask = async (id: Id<'tasks'>) => {
    try {
      await deleteTask({ id })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete task.',
      )
    }
  }

  const handleCompleteTask = async (
    id: Id<'tasks'>,
    currentCompleted: boolean,
  ) => {
    if (currentCompleted) return
    setCelebratingTaskId(id)
    setTimeout(() => setCelebratingTaskId(null), 500)
    setTaskCompletionOverrides((prev) => ({
      ...prev,
      [id]: true,
    }))
    try {
      await completeTaskAndSubtasks({ taskId: id })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to complete task.',
      )
    }
  }

  const handleCompleteAll = async () => {
    setIsCompletingAll(true)
    if (children) {
      setTaskCompletionOverrides((prev) => {
        const next = { ...prev }
        for (const child of children.tasks) {
          next[child._id] = true
        }
        return next
      })
    }
    try {
      await completeTaskAndSubtasks({ taskId: taskId as Id<'tasks'> })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to complete tasks.',
      )
    } finally {
      setIsCompletingAll(false)
    }
  }

  const isFullyComplete = completion
    ? completion.completed >= completion.total
    : false

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16"
        aria-label="Task detail"
      >
        <header className="space-y-3">
          <Button
            asChild
            variant="secondary"
            className="h-9 w-fit px-4"
            aria-label="Back to Daily view"
          >
            <Link to="/" search={{ view: 'day' }}>
              Back to Daily
            </Link>
          </Button>
          {ancestors === undefined || task === undefined ? (
            <div
              className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-600"
              role="status"
              aria-label="Loading path"
            >
              <Spinner aria-label="Loading path" size={14} />
              Loading path...
            </div>
          ) : (
            <nav
              className="flex flex-wrap items-center gap-2 text-sm text-slate-400"
              aria-label="Breadcrumb"
            >
              <Link
                to="/"
                search={{ view: 'day' }}
                className="hover:text-slate-200"
              >
                Daily
              </Link>
              {ancestors.map((ancestor) => (
                <span key={ancestor._id} className="flex items-center gap-2">
                  <span className="text-slate-600">/</span>
                  <Link
                    to="/tasks/$taskId"
                    params={{ taskId: ancestor._id }}
                    className="hover:text-slate-200"
                  >
                    {ancestor.title}
                  </Link>
                </span>
              ))}
              <span className="flex items-center gap-2 text-slate-200">
                <span className="text-slate-600">/</span>
                {task ? task.title : 'Unknown'}
              </span>
            </nav>
          )}
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Task
          </p>
          {task === undefined ? (
            <div
              className="flex items-center gap-2 text-3xl font-semibold text-slate-100"
              role="status"
              aria-label="Loading task"
            >
              <Spinner aria-label="Loading task" size={28} />
              Loading...
            </div>
          ) : task ? (
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-slate-100">
                {task.title}
              </h1>
              <TaskCompletionIndicator
                taskId={task._id}
                completionOverride={effectiveCompletion}
              />
              <Button
                variant="secondary"
                className="h-9 w-fit px-4"
                onClick={handleCompleteAll}
                disabled={isFullyComplete || isCompletingAll}
                aria-label={
                  isCompletingAll ? 'Completing all tasks' : 'Complete all tasks'
                }
              >
                {isCompletingAll ? 'Completing...' : 'Complete all'}
              </Button>
            </div>
          ) : (
            <h1 className="text-3xl font-semibold text-rose-200">
              Task not found
            </h1>
          )}
        </header>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open drawer to add sub-task"
          >
            Add sub-task
          </Button>
          <CreationDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            onAddTask={handleAddTask}
            parentTaskId={task?._id ?? (taskId as Id<'tasks'>)}
            title="Add sub-task"
            defaultDueDate={new Date()}
          />
        </div>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <ListTodo
              className="size-5 shrink-0 text-slate-400"
              strokeWidth={1.5}
              aria-hidden
            />
            Sub-tasks
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            {children === undefined ? (
              <div
                className="flex flex-col items-center gap-4 py-8"
                role="status"
                aria-label="Loading sub-tasks"
              >
                <Spinner aria-label="Loading sub-tasks" size={24} />
                <p className="text-sm text-slate-500">Loading tasks...</p>
                <ul className="w-full space-y-2">
                  {[1, 2, 3].map((i) => (
                    <ListRowSkeleton key={i} />
                  ))}
                </ul>
              </div>
            ) : children.tasks.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-3 py-10 text-center"
                role="status"
                aria-label="No tasks"
              >
                <ClipboardList
                  className="size-12 text-slate-600"
                  strokeWidth={1.25}
                  aria-hidden
                />
                <div className="space-y-1">
                  <p className="text-base font-medium text-slate-300">
                    No sub-tasks yet
                  </p>
                  <p className="text-sm text-slate-500">
                    Add a sub-task to get started.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {children.tasks.map((child) => {
                  const isCompleted =
                    taskCompletionOverrides[child._id] ?? child.isCompleted
                  return (
                    <li
                      key={child._id}
                      className={`flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 ${celebratingTaskId === child._id ? 'animate-completion-bounce' : ''
                        }`}
                    >
                      {editingTaskId === child._id ? (
                        <>
                          <input
                            type="text"
                            value={draftTitles[child._id] ?? ''}
                            onChange={(event) =>
                              setDraftTitles((prev) => ({
                                ...prev,
                                [child._id]: event.target.value,
                              }))
                            }
                            className="h-9 flex-1 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
                            aria-label="Rename task"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              className="h-9 px-4"
                              disabled={
                                !draftTitles[child._id]?.trim() ||
                                draftTitles[child._id]?.trim() === child.title
                              }
                              onClick={() =>
                                saveTaskEditing(child._id, child.title)
                              }
                              aria-label="Save task title"
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 px-4"
                              onClick={() => cancelTaskEditing(child._id)}
                              aria-label="Cancel renaming task"
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <ListTodo
                            className="size-5 shrink-0 text-slate-500"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                          <label className="flex flex-1 items-center gap-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-slate-100 accent-slate-200"
                              checked={isCompleted}
                              onChange={() =>
                                handleCompleteTask(child._id, isCompleted)
                              }
                              aria-label={`Mark ${child.title} complete`}
                            />
                            <Link
                              to="/tasks/$taskId"
                              params={{ taskId: child._id }}
                              className={`flex-1 truncate text-left ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-100'
                                }`}
                            >
                              {child.title}
                            </Link>
                          </label>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 px-4"
                              onClick={() =>
                                startTaskEditing(child._id, child.title)
                              }
                              aria-label={`Rename task ${child.title}`}
                            >
                              Rename
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="h-9 px-4"
                              onClick={() => handleDeleteTask(child._id)}
                              aria-label={`Delete task ${child.title}`}
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </li>
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
