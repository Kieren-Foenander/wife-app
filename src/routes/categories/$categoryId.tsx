import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'

import { CategoryCompletionIndicator } from '../../components/CategoryCompletionIndicator'
import { CreationDrawer } from '../../components/CreationDrawer'
import { Button } from '../../components/ui/button'
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

  const handleAddCategory = async (name: string) => {
    await createCategory({
      name,
      parentCategoryId: categoryId as Id<'categories'>,
    })
    setDrawerOpen(false)
  }

  const handleAddTask = async (title: string) => {
    await createTask({
      title,
      parentCategoryId: categoryId as Id<'categories'>,
    })
    setDrawerOpen(false)
  }

  const handleTaskToggle = async (
    id: Id<'tasks'>,
    currentCompleted: boolean,
  ) => {
    setTaskCompletionOverrides((prev) => ({
      ...prev,
      [id]: !currentCompleted,
    }))
    await toggleTaskCompletion({ id })
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
    } finally {
      setIsBulkCompleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="space-y-3">
          <Button asChild variant="secondary" className="h-9 w-fit px-4">
            <Link to="/" search={{ view: 'day' }}>Back to Daily</Link>
          </Button>
          {ancestors === undefined || category === undefined ? (
            <p className="text-xs uppercase tracking-[0.3em] text-slate-600">
              Loading path...
            </p>
          ) : (
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
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
            <h1 className="text-3xl font-semibold text-slate-100">
              Loading...
            </h1>
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
          <h2 className="text-lg font-semibold text-slate-100">
            Child categories
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            {children === undefined ? (
              <p className="text-sm text-slate-500">Loading categories...</p>
            ) : children.categories.length === 0 ? (
              <p className="text-sm text-slate-500">
                No subcategories yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {children.categories.map((child) => (
                  <li
                    key={child._id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
                  >
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
          <h2 className="text-lg font-semibold text-slate-100">Child tasks</h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            {children === undefined ? (
              <p className="text-sm text-slate-500">Loading tasks...</p>
            ) : children.tasks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No tasks in this category yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {children.tasks.map((task) => {
                  const isCompleted =
                    taskCompletionOverrides[task._id] ?? task.isCompleted
                  return (
                    <li
                      key={task._id}
                      className="flex items-center rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
                    >
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
      </div>
    </div>
  )
}
