import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ClipboardList, ListTodo } from 'lucide-react'
import { toast } from 'sonner'

import {
  CreationDrawer,
  type EditTaskData,
  type TaskFrequency,
  type UpdateTaskParams,
} from '../../components/CreationDrawer'
import { SortableTaskList } from '../../components/SortableTaskList'
import { TaskRow } from '../../components/TaskRow'
import { Button } from '../../components/ui/button'
import { ListRowSkeleton } from '../../components/ui/skeleton'
import { Spinner } from '../../components/ui/spinner'
import { api } from '../../../convex/_generated/api'
import { TaskCompletionIndicator } from '../../components/TaskCompletionIndicator'
import { fromYYYYMMDD, startOfDayUTCFromDate } from '../../lib/dateUtils'
import { buildTaskChildrenViewKey } from '../../lib/taskOrder'
import { useReorderTasks } from '../../lib/useReorderTasks'
import type { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/tasks/$taskId')({
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
  component: TaskDetail,
})

function TaskDetail() {
  const { taskId } = Route.useParams()
  const { date: dateStr } = Route.useSearch()
  const selectedDate = dateStr ? fromYYYYMMDD(dateStr) : new Date()
  const dayStartMs = startOfDayUTCFromDate(selectedDate)
  const task = useQuery(api.todos.getTask, { id: taskId as Id<'tasks'> })
  const ancestors = useQuery(api.todos.listTaskAncestors, {
    taskId: taskId as Id<'tasks'>,
  })
  const viewKey = buildTaskChildrenViewKey(taskId, dayStartMs)
  const children = useQuery(api.todos.listTaskChildren, {
    taskId: taskId as Id<'tasks'>,
    dayStartMs,
    viewKey,
  })
  const completion = useQuery(api.todos.getTaskCompletion, {
    taskId: taskId as Id<'tasks'>,
    dayStartMs,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<EditTaskData | null>(null)
  const [taskCompletionOverrides, setTaskCompletionOverrides] = useState<
    Partial<Record<string, boolean>>
  >({})
  const [celebratingTaskId, setCelebratingTaskId] =
    useState<Id<'tasks'> | null>(null)
  const [isCompletingAll, setIsCompletingAll] = useState(false)
  const createTask = useMutation(api.todos.createTask)
  const updateTask = useMutation(api.todos.updateTask)
  const deleteTask = useMutation(api.todos.deleteTask)
  const setTaskCompletion = useMutation(api.todos.setTaskCompletion)
  const reorderTasks = useReorderTasks()

  const effectiveCompletion = (() => {
    if (!completion) return undefined
    const overrideCount = Object.values(taskCompletionOverrides).filter(Boolean)
      .length
    let completed = Math.min(
      completion.total,
      completion.completed + overrideCount,
    )
    if (children && children.tasks.length > 0) {
      const allChildrenCompleted = children.tasks.every((child) => {
        const override = taskCompletionOverrides[child._id]
        return override ?? child.isCompleted
      })
      if (allChildrenCompleted) {
        completed = Math.min(completion.total, completed + 1)
      }
    }
    return {
      total: completion.total,
      completed,
    }
  })()

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
      setEditingTask(null)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create task.',
      )
    }
  }

  const handleUpdateTask = async (params: UpdateTaskParams) => {
    try {
      await updateTask({
        id: params.id,
        title: params.title,
        dueDate: params.dueDate,
        frequency: params.frequency,
      })
      setDrawerOpen(false)
      setEditingTask(null)
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
    const nextCompleted = !currentCompleted
    if (nextCompleted) {
      setCelebratingTaskId(id)
      setTimeout(() => setCelebratingTaskId(null), 500)
    }
    setTaskCompletionOverrides((prev) => ({
      ...prev,
      [id]: nextCompleted,
    }))
    const shouldCompleteParent =
      nextCompleted &&
      children != null &&
      children.tasks.length > 0 &&
      children.tasks.every((child) => {
        if (child._id === id) return nextCompleted
        const override = taskCompletionOverrides[child._id]
        return override ?? child.isCompleted
      })
    try {
      await setTaskCompletion({
        taskId: id,
        completed: nextCompleted,
        completedDateMs: dayStartMs,
      })
      if (shouldCompleteParent) {
        await setTaskCompletion({
          taskId: taskId as Id<'tasks'>,
          completed: true,
          completedDateMs: dayStartMs,
        })
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to complete task.',
      )
    }
  }

  const handleEditTask = (childTask: {
    _id: Id<'tasks'>
    title: string
    dueDate?: number
    frequency?: TaskFrequency
    parentTaskId?: Id<'tasks'>
  }) => {
    setEditingTask({
      id: childTask._id,
      title: childTask.title,
      dueDate: childTask.dueDate,
      frequency: childTask.frequency,
      parentTaskId: childTask.parentTaskId ?? null,
      parentTaskTitle: task?.title,
    })
    setDrawerOpen(true)
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
      await setTaskCompletion({
        taskId: taskId as Id<'tasks'>,
        completed: true,
        completedDateMs: dayStartMs,
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to complete tasks.',
      )
    } finally {
      setIsCompletingAll(false)
    }
  }

  const handleReorder = (orderedIds: Array<Id<'tasks'>>) => {
    void reorderTasks({
      viewKey,
      taskIds: orderedIds,
      parentTaskId: taskId as Id<'tasks'>,
    })
  }

  const isFullyComplete = effectiveCompletion
    ? effectiveCompletion.completed >= effectiveCompletion.total
    : false

  const handleParentCompleteClick = async () => {
    if (!completion) {
      return
    }
    // If everything is already complete, un-complete the parent and its subtree.
    if (isFullyComplete) {
      setIsCompletingAll(true)
      setTaskCompletionOverrides({})
      try {
        await setTaskCompletion({
          taskId: taskId as Id<'tasks'>,
          completed: false,
          completedDateMs: dayStartMs,
        })
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to un-complete tasks.',
        )
      } finally {
        setIsCompletingAll(false)
      }
      return
    }
    // Otherwise, complete the parent and all sub-tasks.
    void handleCompleteAll()
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-4"
        aria-label="Task detail"
      >
        <header className="space-y-3">
          <Button
            asChild
            variant="secondary"
            className="h-9 w-fit px-4"
            aria-label="Back to Daily view"
          >
            <Link to="/" search={dateStr ? { date: dateStr } : undefined}>
              Go Back
            </Link>
          </Button>
          {ancestors === undefined || task === undefined ? (
            <div
              className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground"
              role="status"
              aria-label="Loading path"
            >
              <Spinner aria-label="Loading path" size={14} />
              Loading path...
            </div>
          ) : (
            <nav
              className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <Link
                to="/"
                search={dateStr ? { date: dateStr } : undefined}
                className="hover:text-foreground"
              >
                Daily
              </Link>
              {ancestors.map((ancestor) => (
                <span key={ancestor._id} className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Link
                    to="/tasks/$taskId"
                    params={{ taskId: ancestor._id }}
                    search={dateStr ? { date: dateStr } : undefined}
                    className="hover:text-foreground"
                  >
                    {ancestor.title}
                  </Link>
                </span>
              ))}
              <span className="flex items-center gap-2 text-foreground">
                <span className="text-muted-foreground">/</span>
                {task ? task.title : 'Unknown'}
              </span>
            </nav>
          )}
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Task
          </p>
          {task === undefined ? (
            <div
              className="flex items-center gap-2 text-3xl font-semibold text-foreground"
              role="status"
              aria-label="Loading task"
            >
              <Spinner aria-label="Loading task" size={28} />
              Loading...
            </div>
          ) : task ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-6 w-6 rounded-full border-2 border-input bg-background text-foreground accent-primary appearance-none checked:bg-primary checked:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  checked={isFullyComplete}
                  onChange={handleParentCompleteClick}
                  disabled={isCompletingAll || !completion}
                  aria-label={
                    isFullyComplete
                      ? 'Mark this task and all sub-tasks incomplete'
                      : 'Mark this task and all sub-tasks complete'
                  }
                />
                <h1 className="text-3xl font-semibold text-foreground">
                  {task.title}
                </h1>
              </div>
              <TaskCompletionIndicator
                taskId={task._id}
                completionOverride={effectiveCompletion}
              />
            </div>
          ) : (
            <h1 className="text-3xl font-semibold text-foreground">
              Task not found
            </h1>
          )}
        </header>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setEditingTask(null)
              setDrawerOpen(true)
            }}
            aria-label="Open drawer to add sub-task"
          >
            Add sub-task
          </Button>
          <CreationDrawer
            open={drawerOpen}
            onOpenChange={(open) => {
              setDrawerOpen(open)
              if (!open) setEditingTask(null)
            }}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            taskToEdit={editingTask}
            parentTaskId={task?._id ?? (taskId as Id<'tasks'>)}
            parentTaskTitle={task?.title}
            title={editingTask ? 'Edit task' : 'Add sub-task'}
            defaultDueDate={selectedDate}
          />
        </div>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ListTodo
              className="size-5 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden
            />
            Sub-tasks
          </h2>
          <div className="rounded-2xl border border-border bg-card/70 p-6">
            {children === undefined ? (
              <div
                className="flex flex-col items-center gap-4 py-8"
                role="status"
                aria-label="Loading sub-tasks"
              >
                <Spinner aria-label="Loading sub-tasks" size={24} />
                <p className="text-sm text-muted-foreground">Loading tasks...</p>
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
                  className="size-12 text-muted-foreground"
                  strokeWidth={1.25}
                  aria-hidden
                />
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">
                    No sub-tasks yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Add a sub-task to get started.
                  </p>
                </div>
              </div>
            ) : (
              <SortableTaskList
                tasks={children.tasks}
                onReorder={handleReorder}
                renderTask={(child, dragProps) => {
                  const isCompleted =
                    taskCompletionOverrides[child._id] ?? child.isCompleted
                  return (
                    <TaskRow
                      key={child._id}
                      task={child}
                      isCompleted={isCompleted}
                      subtaskCompletion={child.subtaskCompletion}
                      celebratingTaskId={celebratingTaskId}
                      onEdit={handleEditTask}
                      handleDelete={handleDeleteTask}
                      handleComplete={handleCompleteTask}
                      dateSearch={dateStr}
                      containerRef={dragProps.containerRef}
                      containerProps={dragProps.containerProps}
                      containerStyle={dragProps.containerStyle}
                      isDragging={dragProps.isDragging}
                      dragHandleRef={dragProps.dragHandleRef}
                      dragHandleProps={dragProps.dragHandleProps}
                    />
                  )
                }}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
