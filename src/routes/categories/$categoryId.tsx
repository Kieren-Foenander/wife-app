import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'

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
                    <span className="flex-1">{task.title}</span>
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
