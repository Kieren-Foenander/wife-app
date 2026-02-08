import { APP_TIME_ZONE } from './dateUtils'

export function formatCalories(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

export function formatWeight(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}

export function formatTime(timestampMs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestampMs))
}

export function formatPortion(entry: CalorieEntry): string {
  if (entry.grams != null) {
    return `${formatNumber(entry.grams)} g`
  }
  if (entry.servings != null) {
    const servingsLabel = formatNumber(entry.servings, 2)
    const suffix = entry.servings === 1 ? 'serving' : 'servings'
    return `${servingsLabel} ${suffix}`
  }
  return 'Portion not set'
}

export function caloriesForGrams({
  grams,
  defaultServingGrams,
  caloriesPerServing,
}: {
  grams: number
  defaultServingGrams: number | null | undefined
  caloriesPerServing: number | null | undefined
}): number {
  if (!defaultServingGrams || defaultServingGrams <= 0) return 0
  if (!caloriesPerServing || caloriesPerServing <= 0) return 0
  return (caloriesPerServing / defaultServingGrams) * grams
}

export type FollowUpQuestion = {
  id: string
  prompt: string
  type: 'text' | 'choice'
  options?: Array<string>
  placeholder?: string
}

export const FOLLOWUP_SKIPPED_ANSWER = '__skipped__'

export type AgentEntry = {
  label: string
  calories: number
  grams?: number | null
  servings?: number | null
}

export type AgentRecipe = {
  name: string
  description?: string | null
  ingredients?: string | null
  servings?: number | null
  defaultServingGrams?: number | null
  caloriesPerServing?: number | null
}

export type AgentEstimate = {
  status: 'needs_follow_up' | 'ready'
  recipe: AgentRecipe | null
  entry: AgentEntry | null
  questions: Array<FollowUpQuestion>
  assumptions: Array<string>
  notes: Array<string>
}

export type DayTotals = {
  consumed: number
  goal: number
  remaining: number
  resetWeekActive: boolean
}

export type CalorieEntry = {
  _id: string
  label: string
  calories: number
  timestampMs: number
  grams?: number | null
  servings?: number | null
}

export type WeightEntry = {
  dayStartMs: number
  kg: number
}

export type Recipe = {
  _id: string
  name: string
  description?: string | null
  ingredients?: string | null
  defaultServingGrams?: number | null
  caloriesPerServing?: number | null
  usageCount?: number | null
}
