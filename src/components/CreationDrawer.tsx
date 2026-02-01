import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from './ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer'
import type { Id } from '../../convex/_generated/dataModel'

type DrawerMode = 'category' | 'task'

export type TaskFrequency =
  | 'daily'
  | 'bi-daily'
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | '6-monthly'
  | 'yearly'

const FREQUENCY_OPTIONS: Array<{ value: TaskFrequency; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'bi-daily', label: 'Every 2 days' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: '6-monthly', label: 'Every 6 months' },
  { value: 'yearly', label: 'Yearly' },
]

export type AddTaskParams = {
  title: string
  parentCategoryId?: Id<'categories'>
  repeatEnabled?: boolean
  frequency?: TaskFrequency
}

type CreationDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, new category/task are created under this category; when null, root. */
  parentCategoryId?: Id<'categories'> | null
  onAddCategory: (name: string) => Promise<void>
  onAddTask: (params: AddTaskParams) => Promise<void>
  /** Title shown in drawer header. */
  title?: string
}

export function CreationDrawer({
  open,
  onOpenChange,
  parentCategoryId,
  onAddCategory,
  onAddTask,
  title = 'Create category or task',
}: CreationDrawerProps) {
  const [mode, setMode] = useState<DrawerMode>('category')
  const [categoryName, setCategoryName] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskParentId, setTaskParentId] = useState<Id<'categories'> | ''>('')
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [taskFrequency, setTaskFrequency] = useState<TaskFrequency | ''>('daily')
  const categories = useQuery(api.todos.listCategories)

  useEffect(() => {
    if (open) {
      setTaskParentId(parentCategoryId ?? '')
    }
  }, [open, parentCategoryId])

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
    await onAddTask({
      title: trimmed,
      parentCategoryId: taskParentId || undefined,
      repeatEnabled,
      frequency: repeatEnabled && taskFrequency ? taskFrequency : undefined,
    })
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
              className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Task title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Pay rent, Call mom"
                  className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
                  aria-label="Task title"
                />
              </div>
              <div>
                <label
                  htmlFor="task-parent"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Parent category
                </label>
                <select
                  id="task-parent"
                  value={taskParentId}
                  onChange={(e) =>
                    setTaskParentId(
                      e.target.value ? (e.target.value as Id<'categories'>) : '',
                    )
                  }
                  className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 focus:border-slate-600 focus:outline-none"
                  aria-label="Parent category"
                >
                  <option value="">None (root)</option>
                  {categories?.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="task-repeat"
                  checked={repeatEnabled}
                  onChange={(e) => setRepeatEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-slate-100 accent-slate-200"
                  aria-label="Repeat task"
                />
                <label
                  htmlFor="task-repeat"
                  className="text-sm font-medium text-slate-300"
                >
                  Repeat
                </label>
              </div>
              {repeatEnabled && (
                <div>
                  <label
                    htmlFor="task-frequency"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Frequency
                  </label>
                  <select
                    id="task-frequency"
                    value={taskFrequency}
                    onChange={(e) =>
                      setTaskFrequency(e.target.value as TaskFrequency)
                    }
                    className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 focus:border-slate-600 focus:outline-none"
                    aria-label="Repeat frequency"
                  >
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                type="submit"
                className="h-10 w-full px-6 sm:w-auto"
                disabled={!taskTitle.trim()}
              >
                Add task
              </Button>
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
