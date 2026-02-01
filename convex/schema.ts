import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  categories: defineTable({
    name: v.string(),
  }),
  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),
  tasks: defineTable({
    title: v.string(),
  }),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
})
