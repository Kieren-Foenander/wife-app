import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'

import { Button } from '../components/ui/button'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/')({
  ssr: false,
  component: DailyView,
})

function DailyView() {
  const [name, setName] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [editingId, setEditingId] = useState<Id<'categories'> | null>(null)
  const [draftNames, setDraftNames] = useState<Record<string, string>>({})
  const [deleteError, setDeleteError] = useState<{
    id: Id<'categories'>
    message: string
  } | null>(null)
  const createCategory = useMutation(api.todos.createCategory)
  const createTask = useMutation(api.todos.createTask)
  const updateCategory = useMutation(api.todos.updateCategory)
  const deleteCategory = useMutation(api.todos.deleteCategory)
  const categories = useQuery(api.todos.listCategories)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    await createCategory({ name: trimmed })
    setName('')
  }

  const handleTaskSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    const trimmed = taskTitle.trim()
    if (!trimmed) {
      return
    }
    await createTask({ title: trimmed })
    setTaskTitle('')
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

        <form
          onSubmit={handleTaskSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg"
        >
          <label className="mb-3 block text-sm font-medium text-slate-300">
            Task title
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Pay rent, Call mom"
              className="h-10 flex-1 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
            />
            <Button
              type="submit"
              className="h-10 px-6"
              disabled={!taskTitle.trim()}
            >
              Add task
            </Button>
          </div>
        </form>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">
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
                          <span className="flex-1">{category.name}</span>
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
      </div>
    </div>
  )
}
