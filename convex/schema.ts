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
  taskOrders: defineTable({
    viewKey: v.string(),
    taskId: v.id('tasks'),
    parentTaskId: v.optional(v.id('tasks')),
    order: v.number(),
  })
    .index('byViewKeyOrder', ['viewKey', 'order'])
    .index('byViewKeyTaskId', ['viewKey', 'taskId']),
  completedTasks: defineTable({
    taskId: v.id('tasks'),
    completedDate: v.optional(v.number()),
  })
    .index('by_task_id', ['taskId'])
    .index('by_task_id_completed_date', ['taskId', 'completedDate']),
  userSettings: defineTable({
    kind: v.string(),
    normalGoal: v.number(),
    maintenanceGoal: v.number(),
    resetWeekStartMs: v.optional(v.number()),
    resetWeekEndMs: v.optional(v.number()),
  }).index('byKind', ['kind']),
  calorieEntries: defineTable({
    dayStartMs: v.number(),
    timestampMs: v.number(),
    label: v.string(),
    calories: v.number(),
    grams: v.optional(v.number()),
    servings: v.optional(v.number()),
  })
    .index('byDayStartMs', ['dayStartMs'])
    .index('byDayStartMsTimestamp', ['dayStartMs', 'timestampMs']),
  recipes: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ingredients: v.optional(v.string()),
    defaultServingGrams: v.optional(v.number()),
    caloriesPerServing: v.optional(v.number()),
    usageCount: v.number(),
  })
    .index('byUsageCount', ['usageCount'])
    .index('byName', ['name']),
  weightEntries: defineTable({
    dayStartMs: v.number(),
    timestampMs: v.number(),
    kg: v.number(),
  })
    .index('byDayStartMs', ['dayStartMs'])
    .index('byDayStartMsTimestamp', ['dayStartMs', 'timestampMs']),
})
