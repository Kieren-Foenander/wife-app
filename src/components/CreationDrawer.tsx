import { useState } from 'react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer'
import { Button } from './ui/button'
import type { Id } from '../../convex/_generated/dataModel'

type DrawerMode = 'category' | 'task'

type CreationDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, new category/task are created under this category; when null, root. */
  parentCategoryId?: Id<'categories'> | null
  onAddCategory: (name: string) => Promise<void>
  onAddTask: (title: string) => Promise<void>
  /** Title shown in drawer header. */
  title?: string
}

export function CreationDrawer({
  open,
  onOpenChange,
  onAddCategory,
  onAddTask,
  title = 'Create category or task',
}: CreationDrawerProps) {
  const [mode, setMode] = useState<DrawerMode>('category')
  const [categoryName, setCategoryName] = useState('')
  const [taskTitle, setTaskTitle] = useState('')

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = categoryName.trim()
    if (!trimmed) return
    await onAddCategory(trimmed)
    setCategoryName('')
  }

  const handleTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = taskTitle.trim()
    if (!trimmed) return
    await onAddTask(trimmed)
    setTaskTitle('')
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent
        className="border-slate-800 bg-slate-950"
        role="dialog"
        aria-label={title}
      >
        <DrawerHeader>
          <DrawerTitle className="text-slate-100">{title}</DrawerTitle>
          <div
            className="mt-3 inline-flex rounded-xl border border-slate-800 bg-slate-900/60 p-1"
            role="tablist"
            aria-label="Creation mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'category'}
              onClick={() => setMode('category')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'category'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              New Category
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'task'}
              onClick={() => setMode('task')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'task'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              New Task
            </button>
          </div>
        </DrawerHeader>
        <div className="flex flex-col gap-6 px-4 pb-4">
          {mode === 'category' && (
            <form
              onSubmit={handleCategorySubmit}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Category name
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Laundry, Groceries, Health"
                  className="h-10 flex-1 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
                  aria-label="Category name"
                />
                <Button type="submit" className="h-10 px-6" disabled={!categoryName.trim()}>
                  Create category
                </Button>
              </div>
            </form>
          )}
          {mode === 'task' && (
            <form
              onSubmit={handleTaskSubmit}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Task title
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Pay rent, Call mom"
                  className="h-10 flex-1 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
                  aria-label="Task title"
                />
                <Button type="submit" className="h-10 px-6" disabled={!taskTitle.trim()}>
                  Add task
                </Button>
              </div>
            </form>
          )}
        </div>
        <DrawerFooter className="flex-row justify-end border-t border-slate-800 pt-4">
          <DrawerClose asChild>
            <Button variant="secondary">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
