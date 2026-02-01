import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { ClipboardList, Folder, FolderOpen, ListTodo } from 'lucide-react'
import { toast } from 'sonner'

import { CategoryCompletionIndicator } from '../../components/CategoryCompletionIndicator'
import { CreationDrawer } from '../../components/CreationDrawer'
import { Button } from '../../components/ui/button'
import { ListRowSkeleton } from '../../components/ui/skeleton'
import { Spinner } from '../../components/ui/spinner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/categories/$categoryId')({
  ssr: false,
  component: CategoryDetail,
})

function CategoryDetail() {
  const { categoryId } = Route.useParams()
  const category = useQuery(api.todos.getCategory, {
    id: categoryId as Id<'categories'>,
  })
  const ancestors = useQuery(api.todos.listCategoryAncestors, {
    id: categoryId as Id<'categories'>,
  })
  const children = useQuery(api.todos.listCategoryChildren, {
    id: categoryId as Id<'categories'>,
  })
  const [taskCompletionOverrides, setTaskCompletionOverrides] = useState<
    Record<string, boolean>
  >({})
  const [celebratingTaskId, setCelebratingTaskId] =
    useState<Id<'tasks'> | null>(null)
  const completionOverride = children
    ? {
        total: children.tasks.length,
        completed: children.tasks.filter(
          (task) => taskCompletionOverrides[task._id] ?? task.isCompleted,
        ).length,
      }
    : undefined
  const directCompletion = children
    ? {
        total: children.tasks.length,
        completed: children.tasks.filter((task) => task.isCompleted).length,
      }
    : undefined
  const completionFromQuery = children?.completion
  const effectiveCompletion =
    completionFromQuery && directCompletion
      ? completionFromQuery.total >= directCompletion.total &&
        completionFromQuery.completed >= directCompletion.completed
        ? completionFromQuery
        : directCompletion
      : completionFromQuery ?? directCompletion
  const createCategory = useMutation(api.todos.createCategory)
  const createTask = useMutation(api.todos.createTask)
  const toggleTaskCompletion = useMutation(api.todos.toggleTaskCompletion)
  const bulkCompleteCategory = useMutation(api.todos.bulkCompleteCategory)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isBulkCompleting, setIsBulkCompleting] = useState(false)
  const hasDescendantTasks = Boolean(effectiveCompletion?.total)
  const hasIncompleteDescendants = effectiveCompletion
    ? effectiveCompletion.completed < effectiveCompletion.total
    : false

  const handleAddCategory = async (params: {
    name: string
    parentCategoryId?: Id<'categories'>
    color?: string
  }) => {
    try {
      await createCategory({
        name: params.name,
        parentCategoryId: params.parentCategoryId ?? (categoryId as Id<'categories'>),
        color: params.color,
      })
      setDrawerOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create category.',
      )
    }
  }

  const handleAddTask = async (params: {
    title: string
    parentCategoryId?: Id<'categories'>
    repeatEnabled?: boolean
    frequency?: 'daily' | 'bi-daily' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | '6-monthly' | 'yearly'
  }) => {
    try {
      await createTask({
        title: params.title,
        parentCategoryId: params.parentCategoryId ?? (categoryId as Id<'categories'>),
        repeatEnabled: params.repeatEnabled,
        frequency: params.frequency,
      })
      setDrawerOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create task.',
      )
    }
  }

  const handleTaskToggle = async (
    id: Id<'tasks'>,
    currentCompleted: boolean,
  ) => {
    if (!currentCompleted) {
      setCelebratingTaskId(id)
      setTimeout(() => setCelebratingTaskId(null), 500)
    }
    setTaskCompletionOverrides((prev) => ({
      ...prev,
      [id]: !currentCompleted,
    }))
    try {
      await toggleTaskCompletion({ id })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update task.',
      )
    }
  }

  const handleBulkComplete = async () => {
    if (!children || !hasIncompleteDescendants) {
      return
    }
    setIsBulkCompleting(true)
    setTaskCompletionOverrides((prev) => {
      const next = { ...prev }
      for (const task of children.tasks) {
        next[task._id] = true
      }
      return next
    })
    try {
      await bulkCompleteCategory({ id: categoryId as Id<'categories'> })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to complete all tasks.',
      )
    } finally {
      setIsBulkCompleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main id="main-content" className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16" aria-label="Category detail">
        <header className="space-y-3">
          <Button asChild variant="secondary" className="h-9 w-fit px-4" aria-label="Back to Daily view">
            <Link to="/" search={{ view: 'day' }}>Back to Daily</Link>
          </Button>
          {ancestors === undefined || category === undefined ? (
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-600" role="status" aria-label="Loading path">
              <Spinner aria-label="Loading path" size={14} />
              Loading path...
            </div>
          ) : (
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-400" aria-label="Breadcrumb">
              <Link to="/" search={{ view: 'day' }} className="hover:text-slate-200">
                Daily
              </Link>
              {ancestors.map((ancestor) => (
                <span key={ancestor._id} className="flex items-center gap-2">
                  <span className="text-slate-600">/</span>
                  <Link
                    to="/categories/$categoryId"
                    params={{ categoryId: ancestor._id }}
                    className="hover:text-slate-200"
                  >
                    {ancestor.name}
                  </Link>
                </span>
              ))}
              <span className="flex items-center gap-2 text-slate-200">
                <span className="text-slate-600">/</span>
                {category ? category.name : 'Unknown'}
              </span>
            </nav>
          )}
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Category
          </p>
          {category === undefined ? (
            <div className="flex items-center gap-2 text-3xl font-semibold text-slate-100" role="status" aria-label="Loading category">
              <Spinner aria-label="Loading category" size={28} />
              Loading...
            </div>
          ) : category ? (
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-slate-100">
                {category.name}
              </h1>
              <CategoryCompletionIndicator
                categoryId={category._id}
                completionOverride={completionOverride}
              />
              {hasDescendantTasks ? (
                <Button
                  variant="secondary"
                  className="h-9 w-fit px-4"
                  onClick={handleBulkComplete}
                  disabled={!hasIncompleteDescendants || isBulkCompleting}
                  aria-label={isBulkCompleting ? 'Completing all tasks' : 'Complete all tasks in this category'}
                >
                  {isBulkCompleting ? 'Completing...' : 'Complete all tasks'}
                </Button>
              ) : null}
            </div>
          ) : (
            <h1 className="text-3xl font-semibold text-rose-200">
              Category not found
            </h1>
          )}
        </header>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open drawer to add category or task"
          >
            Add category or task
          </Button>
          <CreationDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            parentCategoryId={categoryId as Id<'categories'>}
            onAddCategory={handleAddCategory}
            onAddTask={handleAddTask}
            title="Add child category or task"
          />
        </div>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Folder className="size-5 shrink-0 text-slate-400" strokeWidth={1.5} aria-hidden />
            Child categories
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            {children === undefined ? (
              <div className="flex flex-col items-center gap-4 py-8" role="status" aria-label="Loading child categories">
                <Spinner aria-label="Loading child categories" size={24} />
                <p className="text-sm text-slate-500">Loading categories...</p>
                <ul className="w-full space-y-2">
                  {[1, 2].map((i) => (
                    <ListRowSkeleton key={i} />
                  ))}
                </ul>
              </div>
            ) : children.categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center" role="status" aria-label="No subcategories">
                <FolderOpen className="size-12 text-slate-600" strokeWidth={1.25} aria-hidden />
                <div className="space-y-1">
                  <p className="text-base font-medium text-slate-300">No subcategories yet</p>
                  <p className="text-sm text-slate-500">Add a category to break this down.</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {children.categories.map((child) => (
                  <li
                    key={child._id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
                  >
                    <Folder className="size-5 shrink-0 text-slate-500" strokeWidth={1.5} aria-hidden />
                    <Link
                      to="/categories/$categoryId"
                      params={{ categoryId: child._id }}
                      className="flex-1 text-left text-slate-100 hover:text-slate-200"
                    >
                      {child.name}
                    </Link>
                    <CategoryCompletionIndicator categoryId={child._id} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <ListTodo className="size-5 shrink-0 text-slate-400" strokeWidth={1.5} aria-hidden />
            Child tasks
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            {children === undefined ? (
              <div className="flex flex-col items-center gap-4 py-8" role="status" aria-label="Loading child tasks">
                <Spinner aria-label="Loading child tasks" size={24} />
                <p className="text-sm text-slate-500">Loading tasks...</p>
                <ul className="w-full space-y-2">
                  {[1, 2, 3].map((i) => (
                    <ListRowSkeleton key={i} />
                  ))}
                </ul>
              </div>
            ) : children.tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center" role="status" aria-label="No tasks">
                <ClipboardList className="size-12 text-slate-600" strokeWidth={1.25} aria-hidden />
                <div className="space-y-1">
                  <p className="text-base font-medium text-slate-300">No tasks here yet</p>
                  <p className="text-sm text-slate-500">Add a task to get started.</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {children.tasks.map((task) => {
                  const isCompleted =
                    taskCompletionOverrides[task._id] ?? task.isCompleted
                  return (
                    <li
                      key={task._id}
                      className={`flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 ${
                        celebratingTaskId === task._id
                          ? 'animate-completion-bounce'
                          : ''
                      }`}
                    >
                      <ListTodo className="size-5 shrink-0 text-slate-500" strokeWidth={1.5} aria-hidden />
                      <label className="flex flex-1 items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-slate-100 accent-slate-200"
                          checked={isCompleted}
                          onChange={() =>
                            handleTaskToggle(task._id, isCompleted)
                          }
                          aria-label={`Mark ${task.title} complete`}
                        />
                        <span
                          className={`flex-1 ${
                            isCompleted ? 'text-slate-500 line-through' : ''
                          }`}
                        >
                          {task.title}
                        </span>
                      </label>
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
