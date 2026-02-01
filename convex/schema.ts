import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  categories: defineTable({
    name: v.string(),
    parentCategoryId: v.optional(v.id('categories')),
  }),
  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),
  tasks: defineTable({
    title: v.string(),
    parentCategoryId: v.optional(v.id('categories')),
    isCompleted: v.boolean(),
    lastCompletedDate: v.optional(v.number()),
    repeatEnabled: v.optional(v.boolean()),
    frequency: v.optional(v.string()),
  }),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
})
