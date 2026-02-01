import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'

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
  const createCategory = useMutation(api.todos.createCategory)
  const createTask = useMutation(api.todos.createTask)
  const toggleTaskCompletion = useMutation(api.todos.toggleTaskCompletion)
  const [childCategoryName, setChildCategoryName] = useState('')
  const [childTaskTitle, setChildTaskTitle] = useState('')

  const handleChildCategorySubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    const trimmed = childCategoryName.trim()
    if (!trimmed) {
      return
    }
    await createCategory({
      name: trimmed,
      parentCategoryId: categoryId as Id<'categories'>,
    })
    setChildCategoryName('')
  }

  const handleChildTaskSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    const trimmed = childTaskTitle.trim()
    if (!trimmed) {
      return
    }
    await createTask({
      title: trimmed,
      parentCategoryId: categoryId as Id<'categories'>,
    })
    setChildTaskTitle('')
  }

  const handleTaskToggle = async (id: Id<'tasks'>) => {
    await toggleTaskCompletion({ id })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="space-y-3">
          <Button asChild variant="secondary" className="h-9 w-fit px-4">
            <Link to="/">Back to Daily</Link>
          </Button>
          {ancestors === undefined || category === undefined ? (
            <p className="text-xs uppercase tracking-[0.3em] text-slate-600">
              Loading path...
            </p>
          ) : (
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link to="/" className="hover:text-slate-200">
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
            <h1 className="text-3xl font-semibold text-slate-100">
              {category.name}
            </h1>
          ) : (
            <h1 className="text-3xl font-semibold text-rose-200">
              Category not found
            </h1>
          )}
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">
            Add a child category
          </h2>
          <form
            onSubmit={handleChildCategorySubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg"
          >
            <label className="mb-3 block text-sm font-medium text-slate-300">
              Subcategory name
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={childCategoryName}
                onChange={(event) => setChildCategoryName(event.target.value)}
                placeholder="Cleaning, Errands"
                className="h-10 flex-1 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
              />
              <Button
                type="submit"
                className="h-10 px-6"
                disabled={!childCategoryName.trim()}
              >
                Create
              </Button>
            </div>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">
            Add a child task
          </h2>
          <form
            onSubmit={handleChildTaskSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg"
          >
            <label className="mb-3 block text-sm font-medium text-slate-300">
              Task title
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={childTaskTitle}
                onChange={(event) => setChildTaskTitle(event.target.value)}
                placeholder="Vacuum, Wipe counters"
                className="h-10 flex-1 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
              />
              <Button
                type="submit"
                className="h-10 px-6"
                disabled={!childTaskTitle.trim()}
              >
                Add task
              </Button>
            </div>
          </form>
        </section>

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
                    className="flex items-center rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
                  >
                    <Link
                      to="/categories/$categoryId"
                      params={{ categoryId: child._id }}
                      className="flex-1 text-left text-slate-100 hover:text-slate-200"
                    >
                      {child.name}
                    </Link>
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
                {children.tasks.map((task) => (
                  <li
                    key={task._id}
                    className="flex items-center rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100"
                  >
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
                          task.isCompleted ? 'text-slate-500 line-through' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
