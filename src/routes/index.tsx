import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'

import { Button } from '../components/ui/button'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({
  ssr: false,
  component: DailyView,
})

function DailyView() {
  const [name, setName] = useState('')
  const createCategory = useMutation(api.todos.createCategory)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    await createCategory({ name: trimmed })
    setName('')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Daily
          </p>
          <h1 className="text-4xl font-semibold text-slate-100">
            Categories
          </h1>
          <p className="text-base text-slate-400">
            Create a root category to organize today.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg"
        >
          <label className="mb-3 block text-sm font-medium text-slate-300">
            Category name
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Laundry, Groceries, Health"
              className="h-10 flex-1 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
            />
            <Button
              type="submit"
              className="h-10 px-6"
              disabled={!name.trim()}
            >
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
