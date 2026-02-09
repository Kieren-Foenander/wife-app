import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { Id } from '../../convex/_generated/dataModel'

type DragRenderProps = {
  containerRef: (node: HTMLLIElement | null) => void
  containerProps: React.HTMLAttributes<HTMLLIElement>
  containerStyle?: React.CSSProperties
  isDragging: boolean
  dragHandleRef: (node: HTMLButtonElement | null) => void
  dragHandleProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
}

type SortableTaskListProps<T extends { _id: Id<'tasks'> }> = {
  tasks: Array<T>
  onReorder: (orderedIds: Array<Id<'tasks'>>) => void
  renderTask: (task: T, dragProps: DragRenderProps) => React.ReactNode
  isDragDisabled?: (task: T) => boolean
}

function SortableTaskItem<T extends { _id: Id<'tasks'> }>({
  task,
  renderTask,
  disabled,
}: {
  task: T
  renderTask: (task: T, dragProps: DragRenderProps) => React.ReactNode
  disabled?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, disabled })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return renderTask(task, {
    containerRef: setNodeRef,
    containerProps: attributes,
    containerStyle: style,
    isDragging,
    dragHandleRef: setActivatorNodeRef,
    dragHandleProps: listeners
      ? (listeners as React.ButtonHTMLAttributes<HTMLButtonElement>)
      : undefined,
  })
}

export function SortableTaskList<T extends { _id: Id<'tasks'> }>({
  tasks,
  onReorder,
  renderTask,
  isDragDisabled,
}: SortableTaskListProps<T>) {
  const [orderedIds, setOrderedIds] = useState<Array<Id<'tasks'>>>(() =>
    tasks.map((task) => task._id),
  )

  useEffect(() => {
    setOrderedIds(tasks.map((task) => task._id))
  }, [tasks])

  const orderedTasks = useMemo(() => {
    const byId = new Map(tasks.map((task) => [task._id, task]))
    const seen = new Set<Id<'tasks'>>()
    const ordered: Array<T> = []
    for (const id of orderedIds) {
      const task = byId.get(id)
      if (task) {
        ordered.push(task)
        seen.add(id)
      }
    }
    for (const task of tasks) {
      if (!seen.has(task._id)) ordered.push(task)
    }
    return ordered
  }, [orderedIds, tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const currentIds = orderedTasks.map((task) => task._id)
        const oldIndex = currentIds.indexOf(active.id as Id<'tasks'>)
        const newIndex = currentIds.indexOf(over.id as Id<'tasks'>)
        if (oldIndex === -1 || newIndex === -1) return
        const nextIds = arrayMove(currentIds, oldIndex, newIndex)
        setOrderedIds(nextIds)
        onReorder(nextIds)
      }}
    >
      <SortableContext
        items={orderedTasks.map((task) => task._id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-6">
          {orderedTasks.map((task) => (
            <SortableTaskItem
              key={task._id}
              task={task}
              renderTask={renderTask}
              disabled={isDragDisabled?.(task)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
