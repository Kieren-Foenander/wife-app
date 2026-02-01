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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="space-y-3">
          <Button asChild variant="secondary" className="h-9 w-fit px-4">
            <Link to="/">Back to Daily</Link>
          </Button>
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
          <p className="text-base text-slate-400">
            Child items will appear here next.
          </p>
        </header>
      </div>
    </div>
  )
}
