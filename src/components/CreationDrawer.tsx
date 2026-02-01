import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { Folder, ListTodo } from 'lucide-react'
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
import { Spinner } from './ui/spinner'
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

const CATEGORY_COLOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '#fecaca', label: 'Rose' },
  { value: '#fed7aa', label: 'Peach' },
  { value: '#fef08a', label: 'Yellow' },
  { value: '#bbf7d0', label: 'Mint' },
  { value: '#bae6fd', label: 'Sky' },
  { value: '#e9d5ff', label: 'Lavender' },
]

export type AddTaskParams = {
  title: string
  parentCategoryId?: Id<'categories'>
  repeatEnabled?: boolean
  frequency?: TaskFrequency
}

export type AddCategoryParams = {
  name: string
  parentCategoryId?: Id<'categories'>
  color?: string
}

type CreationDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, new category/task are created under this category; when null, root. */
  parentCategoryId?: Id<'categories'> | null
  onAddCategory: (params: AddCategoryParams) => Promise<void>
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
  const [categoryParentId, setCategoryParentId] = useState<Id<'categories'> | ''>('')
  const [categoryColor, setCategoryColor] = useState<string>('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskParentId, setTaskParentId] = useState<Id<'categories'> | ''>('')
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [taskFrequency, setTaskFrequency] = useState<TaskFrequency | ''>('daily')
  const categoriesForPicker = useQuery(api.todos.listCategoriesForParentPicker)

  useEffect(() => {
    if (open) {
      setTaskParentId(parentCategoryId ?? '')
      setCategoryParentId(parentCategoryId ?? '')
    }
  }, [open, parentCategoryId])

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = categoryName.trim()
    if (!trimmed) return
    await onAddCategory({
      name: trimmed,
      parentCategoryId: categoryParentId || undefined,
      color: categoryColor || undefined,
    })
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
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'category'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Folder className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
              New Category
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'task'}
              onClick={() => setMode('task')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'task'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListTodo className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
              New Task
            </button>
          </div>
        </DrawerHeader>
        <div className="flex flex-col gap-6 px-4 pb-4">
          {mode === 'category' && (
            <form
              onSubmit={handleCategorySubmit}
              className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Category name
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Laundry, Groceries, Health"
                  className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
                  aria-label="Category name"
                />
              </div>
              <div>
                <label
                  htmlFor="category-parent"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                >
                  Parent category
                  {categoriesForPicker === undefined ? (
                    <Spinner aria-label="Loading categories" size={14} />
                  ) : null}
                </label>
                <select
                  id="category-parent"
                  value={categoryParentId}
                  onChange={(e) =>
                    setCategoryParentId(
                      e.target.value ? (e.target.value as Id<'categories'>) : '',
                    )
                  }
                  disabled={categoriesForPicker === undefined}
                  className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 focus:border-slate-600 focus:outline-none disabled:opacity-70"
                  aria-label="Parent category"
                  aria-busy={categoriesForPicker === undefined}
                >
                  <option value="">
                    {categoriesForPicker === undefined ? 'Loading...' : 'None (root)'}
                  </option>
                  {categoriesForPicker?.map((c) => (
                    <option key={c._id} value={c._id}>
                      {'\u00A0'.repeat(c.depth * 2)}{c.depth > 0 ? '— ' : ''}{c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="category-color"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Color
                </label>
                <select
                  id="category-color"
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 focus:border-slate-600 focus:outline-none"
                  aria-label="Category color"
                >
                  <option value="">None</option>
                  {CATEGORY_COLOR_OPTIONS.map((opt) => (
                    <option key={opt.value || 'none'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="h-10 w-full px-6 sm:w-auto" disabled={!categoryName.trim()}>
                Create category
              </Button>
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
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                >
                  Parent category
                  {categoriesForPicker === undefined ? (
                    <Spinner aria-label="Loading categories" size={14} />
                  ) : null}
                </label>
                <select
                  id="task-parent"
                  value={taskParentId}
                  onChange={(e) =>
                    setTaskParentId(
                      e.target.value ? (e.target.value as Id<'categories'>) : '',
                    )
                  }
                  disabled={categoriesForPicker === undefined}
                  className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100 focus:border-slate-600 focus:outline-none disabled:opacity-70"
                  aria-label="Parent category"
                  aria-busy={categoriesForPicker === undefined}
                >
                  <option value="">
                    {categoriesForPicker === undefined ? 'Loading...' : 'None (root)'}
                  </option>
                  {categoriesForPicker?.map((c) => (
                    <option key={c._id} value={c._id}>
                      {'\u00A0'.repeat(c.depth * 2)}{c.depth > 0 ? '— ' : ''}{c.name}
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
            <Button variant="secondary" aria-label="Close drawer">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
