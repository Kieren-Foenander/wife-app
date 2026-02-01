import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/** Valid frequency values for recurring tasks. */
export const frequencyValidator = v.union(
  v.literal('daily'),
  v.literal('bi-daily'),
  v.literal('weekly'),
  v.literal('fortnightly'),
  v.literal('monthly'),
  v.literal('quarterly'),
  v.literal('6-monthly'),
  v.literal('yearly'),
)

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    parentTaskId: v.optional(v.id('tasks')),
    dueDate: v.optional(v.number()),
    frequency: v.optional(frequencyValidator),
  }).index('byParentTaskId', ['parentTaskId']),
  completedTasks: defineTable({
    taskId: v.id('tasks'),
    completedDate: v.optional(v.number()),
  })
    .index('by_task_id', ['taskId'])
    .index('by_task_id_completed_date', ['taskId', 'completedDate']),
})
