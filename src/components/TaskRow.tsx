import type React from 'react'
import { Link } from '@tanstack/react-router'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'

import type { Id } from '../../convex/_generated/dataModel'
import type { TaskFrequency } from './CreationDrawer'
import { Button } from './ui/button'

export function TaskRow({
  task,
  isCompleted,
  subtaskCompletion,
  celebratingTaskId,
  onEdit,
  handleDelete,
  handleComplete,
  dateSearch,
  containerRef,
  containerProps,
  containerStyle,
  isDragging,
  dragHandleRef,
  dragHandleProps,
}: {
  task: {
    _id: Id<'tasks'>
    title: string
    dueDate?: number
    frequency?: TaskFrequency
    parentTaskId?: Id<'tasks'>
  }
  isCompleted: boolean
  subtaskCompletion?: { total: number; completed: number }
  celebratingTaskId: Id<'tasks'> | null
  onEdit: (task: {
    _id: Id<'tasks'>
    title: string
    dueDate?: number
    frequency?: TaskFrequency
    parentTaskId?: Id<'tasks'>
  }) => void
  handleDelete: (id: Id<'tasks'>) => void
  handleComplete: (id: Id<'tasks'>, currentCompleted: boolean) => void
  dateSearch?: string
  containerRef?: (node: HTMLLIElement | null) => void
  containerProps?: React.HTMLAttributes<HTMLLIElement>
  containerStyle?: React.CSSProperties
  isDragging?: boolean
  dragHandleRef?: (node: HTMLButtonElement | null) => void
  dragHandleProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
}) {
  const taskLinkSearch = dateSearch ? { date: dateSearch } : undefined
  const showSubtaskCompletion =
    subtaskCompletion && subtaskCompletion.total > 0
  const showDragHandle = Boolean(dragHandleProps)
  const mergedClassName = [
    'flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/70 px-4 py-3 text-sm text-foreground',
    celebratingTaskId === task._id ? 'animate-completion-bounce' : '',
    isDragging ? 'opacity-70' : '',
    containerProps?.className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  const mergedStyle = { ...containerProps?.style, ...containerStyle }
  return (
    <li
      ref={containerRef}
      {...containerProps}
      className={mergedClassName}
      style={mergedStyle}
    >
      <div className="flex flex-1 items-center gap-3">
        <input
          type="checkbox"
          className="h-6 w-6 rounded-full border-2 border-input bg-background text-foreground accent-primary appearance-none checked:bg-primary checked:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          checked={isCompleted}
          onChange={() => handleComplete(task._id, isCompleted)}
          aria-label={`Mark ${task.title} complete`}
        />
        <Link
          to="/tasks/$taskId"
          params={{ taskId: task._id }}
          search={taskLinkSearch}
          className={`flex-1 truncate text-left ${
            isCompleted
              ? 'text-muted-foreground line-through'
              : 'text-foreground'
          }`}
        >
          {task.title}
        </Link>
      </div>
      {showSubtaskCompletion ? (
        <span className="rounded-full border border-border bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
          {subtaskCompletion.completed}/{subtaskCompletion.total} subtasks
        </span>
      ) : null}
      <div className="flex items-center gap-1">
        {showDragHandle ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="cursor-grab touch-none active:cursor-grabbing"
            aria-label={`Drag ${task.title} to reorder`}
            ref={dragHandleRef}
            {...dragHandleProps}
          >
            <GripVertical />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit(task)}
          aria-label={`Edit task ${task.title}`}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => handleDelete(task._id)}
          aria-label={`Delete task ${task.title}`}
        >
          <Trash2 className="text-destructive" />
        </Button>
      </div>
    </li>
  )
}
