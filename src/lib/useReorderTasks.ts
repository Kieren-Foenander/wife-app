import { useMutation } from 'convex/react'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { parseViewKey, reorderTasksById } from './taskOrder'

export function useReorderTasks() {
  return useMutation(api.todos.reorderTasks).withOptimisticUpdate(
    (localStore, args) => {
      const parsed = parseViewKey(args.viewKey)
      if (!parsed) return
      if (parsed.kind === 'root-day') {
        const existing = localStore.getQuery(api.todos.listRootTasksDueOnDate, {
          dayStartMs: parsed.dayStartMs,
          viewKey: args.viewKey,
        })
        if (existing !== undefined) {
          localStore.setQuery(
            api.todos.listRootTasksDueOnDate,
            { dayStartMs: parsed.dayStartMs, viewKey: args.viewKey },
            reorderTasksById(existing, args.taskIds),
          )
        }
        return
      }
      if (parsed.kind === 'children') {
        const existing = localStore.getQuery(api.todos.listTaskChildren, {
          taskId: parsed.parentTaskId as Id<'tasks'>,
          dayStartMs: parsed.dayStartMs,
          viewKey: args.viewKey,
        })
        if (existing !== undefined) {
          localStore.setQuery(
            api.todos.listTaskChildren,
            {
              taskId: parsed.parentTaskId as Id<'tasks'>,
              dayStartMs: parsed.dayStartMs,
              viewKey: args.viewKey,
            },
            {
              ...existing,
              tasks: reorderTasksById(existing.tasks, args.taskIds),
            },
          )
        }
        return
      }
      if (parsed.kind === 'root-week') {
        const existing = localStore.getQuery(api.todos.listRootTasksDueInWeek, {
          refDateMs: parsed.startMs,
          viewKey: args.viewKey,
        })
        if (existing !== undefined) {
          localStore.setQuery(
            api.todos.listRootTasksDueInWeek,
            { refDateMs: parsed.startMs, viewKey: args.viewKey },
            reorderTasksById(existing, args.taskIds),
          )
        }
        return
      }
      if (parsed.kind === 'root-month') {
        const existing = localStore.getQuery(api.todos.listRootTasksDueInMonth, {
          refDateMs: parsed.startMs,
          viewKey: args.viewKey,
        })
        if (existing !== undefined) {
          localStore.setQuery(
            api.todos.listRootTasksDueInMonth,
            { refDateMs: parsed.startMs, viewKey: args.viewKey },
            reorderTasksById(existing, args.taskIds),
          )
        }
        return
      }
      if (parsed.kind === 'root-all') {
        const existing = localStore.getQuery(api.todos.listRootTasks, {
          viewKey: args.viewKey,
        })
        if (existing !== undefined) {
          localStore.setQuery(
            api.todos.listRootTasks,
            { viewKey: args.viewKey },
            reorderTasksById(existing, args.taskIds),
          )
        }
        return
      }
      if (parsed.kind === 'all') {
        const existing = localStore.getQuery(api.todos.listTasks, {
          viewKey: args.viewKey,
        })
        if (existing !== undefined) {
          localStore.setQuery(
            api.todos.listTasks,
            { viewKey: args.viewKey },
            reorderTasksById(existing, args.taskIds),
          )
        }
      }
    },
  )
}
