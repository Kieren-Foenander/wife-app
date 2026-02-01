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
  categories: defineTable({
    name: v.string(),
    parentCategoryId: v.optional(v.id('categories')),
    color: v.optional(v.string()),
  }),
  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),
  tasks: defineTable({
    title: v.string(),
    parentCategoryId: v.optional(v.id('categories')),
    isCompleted: v.optional(v.boolean()),
    lastCompletedDate: v.optional(v.number()),
    repeatEnabled: v.optional(v.boolean()),
    frequency: v.optional(frequencyValidator),
  }),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
})
