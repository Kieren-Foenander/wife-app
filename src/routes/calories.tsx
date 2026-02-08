import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Utensils } from 'lucide-react'
import { toast } from 'sonner'

import { BottomNav } from '../components/BottomNav'
import { Button } from '../components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../components/ui/drawer'
import { ListRowSkeleton, Skeleton } from '../components/ui/skeleton'
import { Spinner } from '../components/ui/spinner'
import {
  APP_TIME_ZONE,
  addDaysUTC,
  fromYYYYMMDD,
  startOfDayUTCFromDate,
  toYYYYMMDDUTC,
} from '../lib/dateUtils'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/calories')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): {
    date?: string
  } => {
    const date =
      typeof search.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : undefined
    return { date }
  },
  component: CaloriesHome,
})

function formatCalories(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

function formatWeight(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(
    value,
  )
}

function formatTime(timestampMs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestampMs))
}

function formatPortion(entry: { grams?: number; servings?: number }): string {
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

function caloriesForGrams({
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

type RoughEstimate = {
  calories: number
  label: string
  basis: 'matched' | 'fallback'
  assumptions: Array<string>
  notes: Array<string>
}

type AccurateEstimateItem = {
  name: string
  grams: number
  calories: number
  caloriesPer100g: number
  source: 'parsed' | 'defaulted'
}

type AccurateEstimate = {
  calories: number
  items: Array<AccurateEstimateItem>
  assumptions: Array<string>
  notes: Array<string>
  totalGrams: number
  defaultServingGrams: number
}

type FollowUpQuestion = {
  id: string
  prompt: string
  type: 'text' | 'choice'
  options?: Array<string>
  placeholder?: string
}

const ROUGH_DEFAULT_SERVING_GRAMS = 100
const ACCURATE_FOLLOWUP_LIMIT = 3
const ACCURATE_SKIPPED_ANSWER = '__skipped__'

const ROUGH_ESTIMATE_RULES: Array<{
  label: string
  minCalories: number
  maxCalories: number
  patterns: Array<RegExp>
}> = [
  {
    label: 'Salad',
    minCalories: 150,
    maxCalories: 350,
    patterns: [/salad/],
  },
  {
    label: 'Sandwich or wrap',
    minCalories: 350,
    maxCalories: 650,
    patterns: [/sandwich/, /wrap/],
  },
  {
    label: 'Burger',
    minCalories: 500,
    maxCalories: 850,
    patterns: [/burger/],
  },
  {
    label: 'Pasta',
    minCalories: 450,
    maxCalories: 750,
    patterns: [/pasta/, /spaghetti/, /noodle/],
  },
  {
    label: 'Rice bowl',
    minCalories: 400,
    maxCalories: 700,
    patterns: [/rice/, /bowl/, /stir fry/],
  },
  {
    label: 'Curry',
    minCalories: 500,
    maxCalories: 800,
    patterns: [/curry/],
  },
  {
    label: 'Soup',
    minCalories: 200,
    maxCalories: 420,
    patterns: [/soup/],
  },
  {
    label: 'Breakfast',
    minCalories: 250,
    maxCalories: 500,
    patterns: [/oat/, /porridge/, /yogurt/, /egg/, /omelet/],
  },
  {
    label: 'Snack',
    minCalories: 200,
    maxCalories: 450,
    patterns: [/snack/, /chips/, /cookie/, /chocolate/],
  },
  {
    label: 'Smoothie',
    minCalories: 250,
    maxCalories: 480,
    patterns: [/smoothie/],
  },
  {
    label: 'Coffee',
    minCalories: 120,
    maxCalories: 260,
    patterns: [/latte/, /cappuccino/, /coffee/],
  },
  {
    label: 'Dessert',
    minCalories: 350,
    maxCalories: 650,
    patterns: [/dessert/, /cake/, /ice cream/],
  },
]

function buildRoughLabel(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return 'Meal'
  const words = trimmed.split(/\s+/).slice(0, 6).join(' ')
  return words.length < trimmed.length ? `${words}…` : words
}

function getRoughEstimate(input: string): RoughEstimate {
  const normalized = input.trim().toLowerCase()
  const matchedRules = ROUGH_ESTIMATE_RULES.filter((rule) =>
    rule.patterns.some((pattern) => pattern.test(normalized)),
  )

  if (matchedRules.length > 0) {
    const min =
      matchedRules.reduce((sum, rule) => sum + rule.minCalories, 0) /
      matchedRules.length
    const max =
      matchedRules.reduce((sum, rule) => sum + rule.maxCalories, 0) /
      matchedRules.length
    const midpoint = (min + max) / 2
    const estimate = Math.round(midpoint * 1.05)
    const primaryLabel =
      matchedRules.length === 1
        ? matchedRules[0].label
        : `${matchedRules[0].label} + more`
    const matchedLabels = matchedRules.map((rule) => rule.label).join(', ')
    return {
      calories: estimate,
      label: primaryLabel,
      basis: 'matched',
      assumptions: [
        'Estimated using quick meal ranges.',
        'Assumed 1 serving (standard portion).',
      ],
      notes: [
        `Matched categories: ${matchedLabels}.`,
        'Inferred portion: 1 serving.',
      ],
    }
  }

  const fallbackMin = 350
  const fallbackMax = 700
  const fallbackEstimate = Math.round(((fallbackMin + fallbackMax) / 2) * 1.1)
  return {
    calories: fallbackEstimate,
    label: buildRoughLabel(input),
    basis: 'fallback',
    assumptions: [
      'No specific match found; used a general meal range.',
      'Assumed 1 serving (standard portion).',
    ],
    notes: ['Inferred portion: 1 serving.', 'Add more detail for accuracy.'],
  }
}

const UNIT_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  cup: 240,
  cups: 240,
}

const CALORIE_DENSITY_RULES: Array<{
  label: string
  caloriesPer100g: number
  patterns: Array<RegExp>
}> = [
  { label: 'Oil', caloriesPer100g: 884, patterns: [/oil/, /olive/] },
  { label: 'Butter', caloriesPer100g: 717, patterns: [/butter/] },
  { label: 'Nuts', caloriesPer100g: 600, patterns: [/nut/, /almond/, /peanut/] },
  { label: 'Cheese', caloriesPer100g: 400, patterns: [/cheese/] },
  { label: 'Beef', caloriesPer100g: 250, patterns: [/beef/, /steak/] },
  { label: 'Pork', caloriesPer100g: 242, patterns: [/pork/, /bacon/] },
  { label: 'Chicken', caloriesPer100g: 165, patterns: [/chicken/, /turkey/] },
  { label: 'Fish', caloriesPer100g: 200, patterns: [/salmon/, /tuna/, /fish/] },
  { label: 'Rice', caloriesPer100g: 130, patterns: [/rice/] },
  { label: 'Pasta', caloriesPer100g: 150, patterns: [/pasta/, /noodle/, /spaghetti/] },
  { label: 'Bread', caloriesPer100g: 265, patterns: [/bread/, /toast/, /wrap/] },
  { label: 'Eggs', caloriesPer100g: 155, patterns: [/egg/] },
  { label: 'Potato', caloriesPer100g: 77, patterns: [/potato/] },
  { label: 'Fruit', caloriesPer100g: 60, patterns: [/apple/, /banana/, /berry/, /fruit/] },
  { label: 'Vegetables', caloriesPer100g: 50, patterns: [/veg/, /salad/, /broccoli/, /carrot/, /spinach/] },
  { label: 'Dairy', caloriesPer100g: 60, patterns: [/milk/, /yogurt/] },
  { label: 'Sugar', caloriesPer100g: 387, patterns: [/sugar/, /honey/] },
]

function parseQuantity(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parts = trimmed.split(' ').filter(Boolean)
  if (parts.length === 2 && parts[1].includes('/')) {
    const whole = Number(parts[0])
    const [num, den] = parts[1].split('/').map(Number)
    if (Number.isFinite(whole) && Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return whole + num / den
    }
  }
  if (trimmed.includes('/')) {
    const [num, den] = trimmed.split('/').map(Number)
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return num / den
    }
  }
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

function getDefaultServingGrams({
  totalGrams,
  servingsCount,
}: {
  totalGrams: number
  servingsCount?: number | null
}): number {
  if (!Number.isFinite(totalGrams) || totalGrams <= 0) {
    return ROUGH_DEFAULT_SERVING_GRAMS
  }
  if (servingsCount && servingsCount > 0) {
    const perServing = totalGrams / servingsCount
    return Number.isFinite(perServing) && perServing > 0 ? perServing : totalGrams
  }
  return totalGrams
}

function normalizeUnit(raw: string | undefined): string | null {
  if (!raw) return null
  const normalized = raw.toLowerCase()
  return UNIT_GRAMS[normalized] ? normalized : null
}

function getCaloriesPer100g(name: string): {
  caloriesPer100g: number
  matchedLabel: string | null
} {
  const normalized = name.toLowerCase()
  const match = CALORIE_DENSITY_RULES.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(normalized)),
  )
  if (match) {
    return { caloriesPer100g: match.caloriesPer100g, matchedLabel: match.label }
  }
  return { caloriesPer100g: 120, matchedLabel: null }
}

function parseAccurateLine(line: string): {
  name: string
  grams: number
  caloriesPer100g: number
  notes: Array<string>
  source: 'parsed' | 'defaulted'
} | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const attachedMatch = trimmed.match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)\s+(.*)$/)
  let quantityRaw = ''
  let unitRaw: string | undefined
  let name = ''
  if (attachedMatch) {
    quantityRaw = attachedMatch[1]
    unitRaw = attachedMatch[2]
    name = attachedMatch[3]
  } else {
    const splitMatch = trimmed.match(/^([\d\s./]+)?\s*([a-zA-Z]+)?\s*(.*)$/)
    if (!splitMatch) return null
    quantityRaw = splitMatch[1]
    unitRaw = splitMatch[2]
    name = splitMatch[3]
  }

  const quantity = parseQuantity(quantityRaw)
  const normalizedUnit = normalizeUnit(unitRaw)
  const notes: Array<string> = []
  const safeName = name.trim() || 'Ingredient'
  let grams = 0
  let source: 'parsed' | 'defaulted' = 'parsed'

  if (quantity == null) {
    grams = 100
    source = 'defaulted'
    notes.push(`Assumed 100g for ${safeName}.`)
  } else if (normalizedUnit) {
    grams = quantity * UNIT_GRAMS[normalizedUnit]
  } else {
    grams = quantity
    source = 'defaulted'
    notes.push(`Assumed grams for ${safeName} (unit not recognized).`)
  }

  const { caloriesPer100g, matchedLabel } = getCaloriesPer100g(safeName)
  if (!matchedLabel) {
    notes.push(`Used a general calorie density for ${safeName}.`)
  }
  return { name: safeName, grams, caloriesPer100g, notes, source }
}

function parseAccurateLineForFollowUp(line: string): {
  name: string
  quantityMissing: boolean
  unitUnknown: boolean
} | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const attachedMatch = trimmed.match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)\s+(.*)$/)
  let quantityRaw = ''
  let unitRaw: string | undefined
  let name = ''
  if (attachedMatch) {
    quantityRaw = attachedMatch[1]
    unitRaw = attachedMatch[2]
    name = attachedMatch[3]
  } else {
    const splitMatch = trimmed.match(/^([\d\s./]+)?\s*([a-zA-Z]+)?\s*(.*)$/)
    if (!splitMatch) return null
    quantityRaw = splitMatch[1]
    unitRaw = splitMatch[2]
    name = splitMatch[3]
  }

  const quantity = parseQuantity(quantityRaw)
  const normalizedUnit = normalizeUnit(unitRaw)
  const safeName = name.trim() || 'this ingredient'
  return {
    name: safeName,
    quantityMissing: quantity == null,
    unitUnknown: quantity != null && normalizedUnit == null,
  }
}

function getAccurateFollowUpQuestions(input: string): Array<FollowUpQuestion> {
  const lines = input
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean)
  const questions: Array<FollowUpQuestion> = []

  if (lines.length > 1) {
    questions.push({
      id: 'servings',
      prompt: 'How many servings does this make?',
      type: 'text',
      placeholder: 'e.g. 2',
    })
  }

  for (const [index, line] of lines.entries()) {
    if (questions.length >= ACCURATE_FOLLOWUP_LIMIT) break
    const parsed = parseAccurateLineForFollowUp(line)
    if (!parsed) continue
    if (parsed.quantityMissing) {
      questions.push({
        id: `amount-${index}`,
        prompt: `About how much ${parsed.name} did you use?`,
        type: 'text',
        placeholder: 'e.g. 120g',
      })
      continue
    }
    if (parsed.unitUnknown) {
      questions.push({
        id: `unit-${index}`,
        prompt: `What unit should we use for ${parsed.name}?`,
        type: 'text',
        placeholder: 'e.g. g, tbsp',
      })
    }
  }

  const normalized = input.toLowerCase()
  if (questions.length < ACCURATE_FOLLOWUP_LIMIT && normalized.includes('rice')) {
    questions.push({
      id: 'rice-state',
      prompt: 'Is the rice cooked or uncooked?',
      type: 'choice',
      options: ['Cooked', 'Uncooked', 'Not sure'],
    })
  }

  if (questions.length < ACCURATE_FOLLOWUP_LIMIT) {
    questions.push({
      id: 'extras',
      prompt: 'Any extras or toppings to include?',
      type: 'text',
      placeholder: 'e.g. sauce, oil, cheese',
    })
  }

  return questions.slice(0, ACCURATE_FOLLOWUP_LIMIT)
}

function getAccurateEstimate(
  input: string,
  servingsCount?: number | null,
): AccurateEstimate {
  const lines = input
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean)
  const assumptions = [
    'Converted common kitchen measures to grams using standard conversions.',
    'Calorie densities are typical values for each ingredient type.',
  ]
  const notes: Array<string> = []
  const items: Array<AccurateEstimateItem> = []

  for (const line of lines) {
    const parsed = parseAccurateLine(line)
    if (!parsed) continue
    notes.push(...parsed.notes)
    const calories = (parsed.caloriesPer100g / 100) * parsed.grams
    items.push({
      name: parsed.name,
      grams: parsed.grams,
      calories,
      caloriesPer100g: parsed.caloriesPer100g,
      source: parsed.source,
    })
  }

  if (items.length === 0) {
    const fallback = getRoughEstimate(input)
    const totalGrams = ROUGH_DEFAULT_SERVING_GRAMS
    return {
      calories: fallback.calories,
      items: [
        {
          name: fallback.label,
          grams: totalGrams,
          calories: fallback.calories,
          caloriesPer100g: Math.round((fallback.calories / ROUGH_DEFAULT_SERVING_GRAMS) * 100),
          source: 'defaulted',
        },
      ],
      assumptions: [
        ...assumptions,
        'No ingredients parsed; used a quick estimate instead.',
      ],
      notes: [...fallback.notes],
      totalGrams,
      defaultServingGrams: getDefaultServingGrams({ totalGrams, servingsCount }),
    }
  }

  const calories = items.reduce((sum, item) => sum + item.calories, 0)
  const totalGrams = items.reduce((sum, item) => sum + item.grams, 0)
  return {
    calories,
    items,
    assumptions,
    notes,
    totalGrams,
    defaultServingGrams: getDefaultServingGrams({ totalGrams, servingsCount }),
  }
}

function WeightTrend({
  entries,
  startDayMs,
  endDayMs,
}: {
  entries: Array<{ dayStartMs: number; kg: number }>
  startDayMs: number
  endDayMs: number
}) {
  if (entries.length < 2) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-10 text-center"
        role="status"
        aria-label="Weight trend empty state"
      >
        <p className="text-base font-medium text-foreground">
          Add your weight to see trend
        </p>
        <p className="text-sm text-muted-foreground">
          Once you have a couple of weigh-ins, we&apos;ll plot your last 30
          days.
        </p>
      </div>
    )
  }

  const sorted = [...entries].sort((a, b) => a.dayStartMs - b.dayStartMs)
  const weights = sorted.map((entry) => entry.kg)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = Math.max(max - min, 0.5)
  const padding = range * 0.1
  const minValue = min - padding
  const maxValue = max + padding

  const width = 320
  const height = 140
  const paddingX = 16
  const paddingY = 18
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2
  const span = Math.max(endDayMs - startDayMs, 1)

  const points = sorted.map((entry) => {
    const x =
      paddingX + ((entry.dayStartMs - startDayMs) / span) * innerWidth
    const ratio = (entry.kg - minValue) / Math.max(maxValue - minValue, 1)
    const y = paddingY + innerHeight - ratio * innerHeight
    return { x, y }
  })

  const path = points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(' ')

  const startLabel = new Date(startDayMs).toLocaleDateString('en-US', {
    timeZone: APP_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  })
  const endLabel = new Date(endDayMs).toLocaleDateString('en-US', {
    timeZone: APP_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full"
        role="img"
        aria-label="Weight trend line chart"
      >
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="text-primary"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={3.5}
            className="fill-primary"
          />
        ))}
      </svg>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{startLabel}</span>
        <span>
          {formatWeight(weights[0])} kg →{' '}
          {formatWeight(weights[weights.length - 1])} kg
        </span>
        <span>{endLabel}</span>
      </div>
    </div>
  )
}

function ProgressRing({
  consumed,
  goal,
}: {
  consumed: number
  goal: number
}) {
  const normalizedGoal = Math.max(goal, 0)
  const ratio =
    normalizedGoal === 0 ? 0 : Math.min(consumed / normalizedGoal, 1)
  const isOver = normalizedGoal > 0 && consumed > normalizedGoal
  const size = 160
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - ratio)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} role="img">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={isOver ? 'text-destructive' : 'text-primary'}
            style={{ transition: 'stroke-dashoffset 200ms ease-out' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            {isOver ? 'Over' : 'Progress'}
          </p>
          <p className="text-2xl font-semibold text-foreground">
            {normalizedGoal === 0
              ? '0%'
              : `${Math.round((consumed / normalizedGoal) * 100)}%`}
          </p>
        </div>
      </div>
      <div
        className="text-xs text-muted-foreground"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={normalizedGoal || 0}
        aria-valuenow={Math.min(consumed, normalizedGoal)}
        aria-label="Calories progress"
      >
        {formatCalories(consumed)} / {formatCalories(goal)} kcal
      </div>
    </div>
  )
}

function CaloriesHome() {
  const { date: dateStr } = Route.useSearch()
  const selectedDate = dateStr
    ? fromYYYYMMDD(dateStr)
    : fromYYYYMMDD(toYYYYMMDDUTC(new Date()))
  const dayStartMs = startOfDayUTCFromDate(selectedDate)
  const todayDate = fromYYYYMMDD(toYYYYMMDDUTC(new Date()))
  const weightRangeStartDate = addDaysUTC(todayDate, -29)
  const weightRangeStart = startOfDayUTCFromDate(weightRangeStartDate)
  const weightRangeEnd = startOfDayUTCFromDate(todayDate)
  const totals = useQuery(api.calorieEntries.getDayTotals, { dayStartMs })
  const entries = useQuery(api.calorieEntries.listEntriesForDay, {
    dayStartMs,
    order: 'desc',
  })
  const recipes = useQuery(api.recipes.listRecipes)
  const createEntry = useMutation(api.calorieEntries.createCalorieEntry)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [recipeSearch, setRecipeSearch] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [gramsInput, setGramsInput] = useState('')
  const [drawerMode, setDrawerMode] = useState<'list' | 'addNew'>('list')
  const [addNewText, setAddNewText] = useState('')
  const [roughEstimate, setRoughEstimate] = useState<RoughEstimate | null>(null)
  const [roughGramsInput, setRoughGramsInput] = useState('')
  const [accurateEstimate, setAccurateEstimate] = useState<AccurateEstimate | null>(
    null,
  )
  const [accurateServingGramsInput, setAccurateServingGramsInput] = useState('')
  const [accurateQuestions, setAccurateQuestions] = useState<Array<FollowUpQuestion>>(
    [],
  )
  const [accurateAnswers, setAccurateAnswers] = useState<
    Record<string, string | undefined>
  >({})
  const [accurateStep, setAccurateStep] = useState<'questions' | 'result' | null>(
    null,
  )
  const normalizedSearch = recipeSearch.trim().toLowerCase()
  const visibleRecipes =
    recipes?.filter((recipe) => {
      if (!normalizedSearch) return true
      const name = recipe.name.toLowerCase()
      const description = recipe.description?.toLowerCase() ?? ''
      return name.includes(normalizedSearch) || description.includes(normalizedSearch)
    }) ?? []
  const selectedRecipe =
    recipes?.find((recipe) => recipe._id === selectedRecipeId) ?? null
  const weightEntries = useQuery(api.weightEntries.listWeightEntriesForRange, {
    startDayMs: weightRangeStart,
    endDayMs: weightRangeEnd,
  })
  const isSelectedToday =
    dayStartMs === startOfDayUTCFromDate(new Date())
  const addContextLabel = isSelectedToday
    ? 'Today'
    : selectedDate.toLocaleDateString('en-US', {
        timeZone: APP_TIME_ZONE,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
  const entriesTitle = isSelectedToday ? "Today's entries" : 'Entries'
  const isAddNew = drawerMode === 'addNew'
  const handleAddClick = () => {
    setDrawerOpen(true)
    setDrawerMode('list')
  }
  const handleAddNew = () => {
    setSelectedRecipeId(null)
    setDrawerMode('addNew')
  }
  const handleBackToList = () => {
    setSelectedRecipeId(null)
    setDrawerMode('list')
  }
  const handleRunRoughEstimate = () => {
    if (!addNewText.trim()) {
      toast('Add a short description first.')
      return
    }
    setRoughEstimate(getRoughEstimate(addNewText))
  }
  const handleRunAccurateEstimate = () => {
    if (!addNewText.trim()) {
      toast('Add a short description first.')
      return
    }
    setRoughEstimate(null)
    const questions = getAccurateFollowUpQuestions(addNewText)
    setAccurateQuestions(questions)
    setAccurateAnswers({})
    if (questions.length === 0) {
      setAccurateEstimate(getAccurateEstimate(addNewText))
      setAccurateStep('result')
    } else {
      setAccurateEstimate(null)
      setAccurateStep('questions')
    }
  }
  const handleAccurateAnswerChange = (id: string, value: string) => {
    setAccurateAnswers((prev) => ({ ...prev, [id]: value }))
  }
  const handleAccurateSkipQuestion = (id: string) => {
    setAccurateAnswers((prev) => ({ ...prev, [id]: ACCURATE_SKIPPED_ANSWER }))
  }
  const handleAccurateSkipAll = () => {
    const skippedAnswers: Record<string, string> = {}
    accurateQuestions.forEach((question) => {
      skippedAnswers[question.id] = ACCURATE_SKIPPED_ANSWER
    })
    setAccurateAnswers((prev) => ({ ...prev, ...skippedAnswers }))
    const estimate = getAccurateEstimate(addNewText)
    const followUpNotes = accurateQuestions.map((question) => {
      const answer = skippedAnswers[question.id]
      return `Follow-up: ${question.prompt} ${answer === ACCURATE_SKIPPED_ANSWER ? 'Skipped; used best guess.' : answer}`
    })
    setAccurateEstimate({
      ...estimate,
      notes: [...estimate.notes, ...followUpNotes],
    })
    setAccurateStep('result')
  }
  const handleAccurateFinalize = () => {
    const servingsAnswer = accurateAnswers.servings
    const servingsCount =
      servingsAnswer && servingsAnswer !== ACCURATE_SKIPPED_ANSWER
        ? parseQuantity(servingsAnswer)
        : null
    const estimate = getAccurateEstimate(addNewText, servingsCount)
    const followUpNotes = accurateQuestions.map((question) => {
      const answer = accurateAnswers[question.id]
      if (!answer || answer === ACCURATE_SKIPPED_ANSWER) {
        return `Follow-up: ${question.prompt} Skipped; used best guess.`
      }
      return `Follow-up: ${question.prompt} ${answer}`
    })
    setAccurateEstimate({
      ...estimate,
      notes: [...estimate.notes, ...followUpNotes],
    })
    setAccurateStep('result')
  }
  const handleDrawerChange = (open: boolean) => {
    setDrawerOpen(open)
    if (!open) {
      setSelectedRecipeId(null)
      setRecipeSearch('')
      setGramsInput('')
      setDrawerMode('list')
      setAddNewText('')
      setRoughEstimate(null)
      setRoughGramsInput('')
      setAccurateEstimate(null)
      setAccurateQuestions([])
      setAccurateAnswers({})
      setAccurateStep(null)
      setAccurateServingGramsInput('')
    }
  }

  useEffect(() => {
    if (!selectedRecipe) return
    if (selectedRecipe.defaultServingGrams != null) {
      setGramsInput(String(selectedRecipe.defaultServingGrams))
    } else {
      setGramsInput('')
    }
  }, [selectedRecipe])

  useEffect(() => {
    if (!roughEstimate) return
    setRoughEstimate(null)
  }, [addNewText])

  useEffect(() => {
    if (!accurateEstimate && accurateQuestions.length === 0 && !accurateStep) return
    setAccurateEstimate(null)
    setAccurateQuestions([])
    setAccurateAnswers({})
    setAccurateStep(null)
    setAccurateServingGramsInput('')
  }, [addNewText])

  useEffect(() => {
    if (!roughEstimate) return
    setRoughGramsInput('')
  }, [roughEstimate])

  useEffect(() => {
    if (!accurateEstimate) {
      setAccurateServingGramsInput('')
      return
    }
    setAccurateServingGramsInput(
      accurateEstimate.defaultServingGrams
        ? String(Math.round(accurateEstimate.defaultServingGrams))
        : '',
    )
  }, [accurateEstimate])

  const parsedGrams = Number(gramsInput)
  const grams = Number.isFinite(parsedGrams) ? parsedGrams : 0
  const computedCalories = selectedRecipe
    ? caloriesForGrams({
      grams,
      defaultServingGrams: selectedRecipe.defaultServingGrams ?? null,
      caloriesPerServing: selectedRecipe.caloriesPerServing ?? null,
    })
    : 0
  const canLog =
    !!selectedRecipe && grams > 0 && computedCalories > 0 && !Number.isNaN(grams)
  const canRunAddNew = addNewText.trim().length > 0
  const parsedRoughGrams = Number(roughGramsInput)
  const roughGrams = Number.isFinite(parsedRoughGrams) ? parsedRoughGrams : 0
  const roughCalories =
    roughEstimate == null
      ? 0
      : roughGrams > 0
        ? roughEstimate.calories * (roughGrams / ROUGH_DEFAULT_SERVING_GRAMS)
        : roughEstimate.calories
  const canLogRough =
    roughEstimate != null && roughCalories > 0 && !Number.isNaN(roughCalories)
  const parsedAccurateServingGrams = Number(accurateServingGramsInput)
  const accurateServingGrams =
    accurateEstimate == null
      ? 0
      : Number.isFinite(parsedAccurateServingGrams) && parsedAccurateServingGrams > 0
        ? parsedAccurateServingGrams
        : accurateEstimate.defaultServingGrams
  const accurateCaloriesPerGram =
    accurateEstimate && accurateEstimate.totalGrams > 0
      ? accurateEstimate.calories / accurateEstimate.totalGrams
      : 0
  const accurateServingCalories =
    accurateEstimate == null ? 0 : accurateServingGrams * accurateCaloriesPerGram
  const handleLogRecipe = async () => {
    if (!selectedRecipe) return
    if (!canLog) {
      toast('Add grams to log this recipe.')
      return
    }
    await createEntry({
      dayStartMs,
      label: selectedRecipe.name,
      calories: Math.round(computedCalories),
      grams,
    })
    toast('Recipe logged.')
    handleDrawerChange(false)
  }

  const handleLogRough = async () => {
    if (!roughEstimate) return
    if (!canLogRough) {
      toast('Add a rough estimate before logging.')
      return
    }
    const trimmedLabel = addNewText.trim()
    await createEntry({
      dayStartMs,
      label: trimmedLabel || roughEstimate.label,
      calories: Math.round(roughCalories),
      grams: roughGrams > 0 ? roughGrams : undefined,
      servings: roughGrams > 0 ? undefined : 1,
    })
    toast('Entry logged.')
    handleDrawerChange(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 pb-32 pt-4"
        aria-label="Calories home"
      >
        <header className="space-y-4">
          <p className="text-center text-xl font-semibold text-muted-foreground">
            Wife App
          </p>
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              {isSelectedToday
                ? `Today - ${selectedDate.toLocaleDateString('en-US', {
                  timeZone: APP_TIME_ZONE,
                  weekday: 'long',
                })}`
                : selectedDate.toLocaleDateString('en-US', {
                  timeZone: APP_TIME_ZONE,
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
            </p>
            <h1 className="text-4xl font-semibold text-foreground">Calories</h1>
            <p className="text-base text-muted-foreground">
              Stay on track with a quick daily check-in.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card/70 p-6">
          {totals === undefined ? (
            <div
              className="flex flex-col items-center gap-3 py-6"
              role="status"
              aria-label="Loading calorie totals"
            >
              <Spinner aria-label="Loading calorie totals" size={24} />
              <p className="text-sm text-muted-foreground">Loading totals...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <ProgressRing consumed={totals.consumed} goal={totals.goal} />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Remaining
                </p>
                <p className="text-5xl font-semibold text-foreground">
                  {formatCalories(totals.remaining)} kcal
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  Consumed: {formatCalories(totals.consumed)} kcal
                </span>
                <span>Goal: {formatCalories(totals.goal)} kcal</span>
              </div>
              {totals.resetWeekActive ? (
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                  <p className="font-medium">Reset week active</p>
                  <p className="text-xs text-muted-foreground">
                    Streak paused while you focus on maintenance.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              30-day weight trend
            </h2>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-6">
            {weightEntries === undefined ? (
              <div
                className="flex flex-col gap-4"
                role="status"
                aria-label="Loading weight trend"
              >
                <Skeleton className="h-40 w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ) : (
              <WeightTrend
                entries={weightEntries.map((entry) => ({
                  dayStartMs: entry.dayStartMs,
                  kg: entry.kg,
                }))}
                startDayMs={weightRangeStart}
                endDayMs={weightRangeEnd}
              />
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Utensils
                className="size-5 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden
              />
              {entriesTitle}
            </h2>
            <Button type="button" onClick={handleAddClick}>
              + Add
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-6">
            {entries === undefined ? (
              <div
                className="flex flex-col items-center gap-4 py-8"
                role="status"
                aria-label="Loading entries"
              >
                <Spinner aria-label="Loading entries" size={24} />
                <p className="text-sm text-muted-foreground">
                  Loading entries...
                </p>
                <ul className="w-full space-y-2">
                  {[1, 2, 3].map((i) => (
                    <ListRowSkeleton key={i} />
                  ))}
                </ul>
              </div>
            ) : entries.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-3 py-10 text-center"
                role="status"
                aria-label="No entries"
              >
                <Utensils
                  className="size-12 text-muted-foreground"
                  strokeWidth={1.25}
                  aria-hidden
                />
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">
                    No entries yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tap + Add to log your first meal.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {entries.map((entry) => {
                  const portionLabel = formatPortion(entry)
                  return (
                    <li
                      key={entry._id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3"
                    >
                      <div className="space-y-1">
                        <p className="text-base font-medium text-foreground">
                          {entry.label}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatTime(entry.timestampMs)}</span>
                          <span aria-hidden="true">•</span>
                          <span>{portionLabel}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-foreground">
                          {formatCalories(entry.calories)} kcal
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </main>
      <Drawer open={drawerOpen} onOpenChange={handleDrawerChange} direction="bottom">
        <DrawerContent
          className="border-border bg-card"
          role="dialog"
          aria-label="Add entry"
        >
          <DrawerHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <DrawerTitle className="text-foreground">
                  {selectedRecipe
                    ? 'Confirm entry'
                    : isAddNew
                      ? 'Add new'
                      : 'Add entry'}
                </DrawerTitle>
                <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Logging for {addContextLabel}
                </p>
              </div>
              {selectedRecipe || isAddNew ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-0 text-sm text-muted-foreground"
                  onClick={handleBackToList}
                >
                  Back to list
                </Button>
              ) : null}
            </div>
          </DrawerHeader>
          {selectedRecipe ? (
            <div className="flex flex-col gap-4 px-4 pb-4">
              <div className="rounded-2xl border border-border bg-card/70 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Recipe
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {selectedRecipe.name}
                </p>
                {selectedRecipe.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedRecipe.description}
                  </p>
                ) : null}
              </div>
              <div className="rounded-2xl border border-border bg-card/70 p-4">
                <label
                  htmlFor="recipe-grams"
                  className="mb-2 block text-sm font-medium text-muted-foreground"
                >
                  Serving size (grams)
                </label>
                <input
                  id="recipe-grams"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  value={gramsInput}
                  onChange={(e) => setGramsInput(e.target.value)}
                  placeholder="Enter grams"
                  className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>Calories for this amount</span>
                  <span className="text-base font-semibold text-foreground">
                    {formatCalories(computedCalories)} kcal
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card/70 p-4">
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    Details
                  </summary>
                  <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {selectedRecipe.ingredients ? (
                      <p>{selectedRecipe.ingredients}</p>
                    ) : null}
                    {!selectedRecipe.ingredients ? (
                      <p>No extra details saved for this recipe yet.</p>
                    ) : null}
                  </div>
                </details>
              </div>
            </div>
          ) : isAddNew ? (
            <div className="flex flex-col gap-4 px-4 pb-4">
              <div className="rounded-2xl border border-border bg-card/70 p-4">
                <label
                  htmlFor="add-new-text"
                  className="mb-2 block text-sm font-medium text-muted-foreground"
                >
                  Describe your meal
                </label>
                <textarea
                  id="add-new-text"
                  value={addNewText}
                  onChange={(e) => setAddNewText(e.target.value)}
                  placeholder="e.g. Chicken stir fry with rice"
                  rows={4}
                  className="min-h-[96px] w-full rounded-md border border-input bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  One line is enough to get started.
                </p>
              </div>
              <div className="grid gap-2">
                <Button
                  type="button"
                  onClick={handleRunRoughEstimate}
                  disabled={!canRunAddNew}
                >
                  Rough estimate (fast)
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRunAccurateEstimate}
                  disabled={!canRunAddNew}
                >
                  Accurate (add ingredients)
                </Button>
              </div>
              {accurateStep === 'questions' && accurateQuestions.length > 0 ? (
                <div className="rounded-2xl border border-border bg-card/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        Follow-up questions
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Optional for accuracy. Skip any you don&apos;t want to answer.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto px-0 text-xs text-muted-foreground"
                      onClick={handleAccurateSkipAll}
                    >
                      Use best guess
                    </Button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {accurateQuestions.map((question) => {
                      const answer = accurateAnswers[question.id]
                      const isSkipped = answer === ACCURATE_SKIPPED_ANSWER
                      return (
                        <div
                          key={question.id}
                          className="rounded-xl border border-border/70 bg-background/70 p-3"
                        >
                          <p className="text-sm font-medium text-foreground">
                            {question.prompt}
                          </p>
                          {question.type === 'text' ? (
                            <input
                              type="text"
                              value={isSkipped ? '' : answer ?? ''}
                              onChange={(e) =>
                                handleAccurateAnswerChange(
                                  question.id,
                                  e.target.value,
                                )
                              }
                              placeholder={question.placeholder}
                              disabled={isSkipped}
                              className="mt-2 h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none disabled:opacity-70"
                            />
                          ) : question.options ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {question.options.map((option) => {
                                const isSelected = answer === option
                                return (
                                  <Button
                                    key={option}
                                    type="button"
                                    variant={isSelected ? 'secondary' : 'ghost'}
                                    className="h-8 px-3 text-xs"
                                    disabled={isSkipped}
                                    onClick={() =>
                                      handleAccurateAnswerChange(
                                        question.id,
                                        option,
                                      )
                                    }
                                  >
                                    {option}
                                  </Button>
                                )
                              })}
                            </div>
                          ) : null}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-auto px-0 text-xs text-muted-foreground"
                              onClick={() => handleAccurateSkipQuestion(question.id)}
                              disabled={isSkipped}
                            >
                              Skip / Use best guess
                            </Button>
                            {isSkipped ? (
                              <span className="text-xs text-muted-foreground">
                                Skipped
                              </span>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <Button
                    type="button"
                    className="mt-4 w-full"
                    onClick={handleAccurateFinalize}
                  >
                    Get estimate
                  </Button>
                </div>
              ) : null}
              {roughEstimate ? (
                <div className="rounded-2xl border border-border bg-card/70 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Rough estimate
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {formatCalories(roughEstimate.calories)} kcal
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    For 1 serving
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Interpreted as{' '}
                    <span className="font-medium text-foreground">
                      {roughEstimate.label}
                    </span>
                    .
                  </p>
                  {roughEstimate.basis === 'fallback' ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      This is a quick best guess based on your description.
                    </p>
                  ) : null}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">
                      Details
                    </summary>
                    <div className="mt-2 space-y-3 text-sm text-muted-foreground">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Assumptions
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {roughEstimate.assumptions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Notes
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {roughEstimate.notes.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </details>
                </div>
              ) : null}
              {accurateEstimate ? (
                <div className="rounded-2xl border border-border bg-card/70 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Accurate estimate
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {formatCalories(accurateEstimate.calories)} kcal
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Based on your ingredient list
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {accurateEstimate.items.map((item, index) => (
                      <div
                        key={`${item.name}-${item.grams}-${index}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>
                          {item.name} · {formatNumber(item.grams, 0)} g
                        </span>
                        <span className="text-foreground">
                          {formatCalories(item.calories)} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border border-border/70 bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Default serving
                    </p>
                    <label
                      htmlFor="accurate-serving-grams"
                      className="mt-2 block text-sm font-medium text-muted-foreground"
                    >
                      Serving size (grams)
                    </label>
                    <input
                      id="accurate-serving-grams"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      value={accurateServingGramsInput}
                      onChange={(e) => setAccurateServingGramsInput(e.target.value)}
                      placeholder="Enter grams per serving"
                      className="mt-2 h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                      <span>Calories for this serving</span>
                      <span className="text-base font-semibold text-foreground">
                        {formatCalories(accurateServingCalories)} kcal
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Adjust before saving or logging.
                    </p>
                  </div>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">
                      Details
                    </summary>
                    <div className="mt-2 space-y-3 text-sm text-muted-foreground">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Assumptions
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {accurateEstimate.assumptions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      {accurateEstimate.notes.length > 0 ? (
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            Notes
                          </p>
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {accurateEstimate.notes.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </details>
                </div>
              ) : null}
              {roughEstimate ? (
                <div className="rounded-2xl border border-border bg-card/70 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Confirm portion
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>Default portion</span>
                    <span className="text-foreground">1 serving</span>
                  </div>
                  <label
                    htmlFor="rough-grams"
                    className="mt-4 block text-sm font-medium text-muted-foreground"
                  >
                    Optional grams override
                  </label>
                  <input
                    id="rough-grams"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    value={roughGramsInput}
                    onChange={(e) => setRoughGramsInput(e.target.value)}
                    placeholder="Enter grams if you weighed it"
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Calories scale assuming 100g per serving.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>Calories for this entry</span>
                    <span className="text-base font-semibold text-foreground">
                      {formatCalories(roughCalories)} kcal
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-4 px-4 pb-4">
              <div className="rounded-xl border border-border bg-card/70 p-4">
                <label
                  htmlFor="recipe-search"
                  className="mb-2 block text-sm font-medium text-muted-foreground"
                >
                  Search saved recipes
                </label>
                <input
                  id="recipe-search"
                  type="text"
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  placeholder="Search by recipe name"
                  className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                  aria-label="Search saved recipes"
                />
              </div>
              <div className="rounded-2xl border border-border bg-card/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Saved recipes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Most used first
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {normalizedSearch ? `${visibleRecipes.length} matches` : ''}
                  </span>
                </div>
                <div className="mt-3">
                  {recipes === undefined ? (
                    <ul className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <ListRowSkeleton key={i} />
                      ))}
                    </ul>
                  ) : visibleRecipes.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center gap-2 py-8 text-center"
                      role="status"
                      aria-label="No saved recipes"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {normalizedSearch
                          ? 'No recipes match your search'
                          : 'No saved recipes yet'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {normalizedSearch
                          ? 'Try a different name.'
                          : 'Tap Add new to save a recipe.'}
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {visibleRecipes.map((recipe) => (
                        <li key={recipe._id}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-left transition hover:bg-muted/40"
                            onClick={() => {
                              setSelectedRecipeId(recipe._id)
                              setDrawerMode('list')
                            }}
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                {recipe.name}
                              </p>
                              {recipe.description ? (
                                <p className="text-xs text-muted-foreground">
                                  {recipe.description}
                                </p>
                              ) : null}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {recipe.usageCount} uses
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          <DrawerFooter className="flex-row justify-between border-t border-border pt-4">
            <DrawerClose asChild>
              <Button variant="secondary" aria-label="Close drawer">
                Close
              </Button>
            </DrawerClose>
            {selectedRecipe ? (
              <Button type="button" onClick={handleLogRecipe} disabled={!canLog}>
                Log
              </Button>
            ) : isAddNew ? (
              roughEstimate ? (
                <Button type="button" onClick={handleLogRough} disabled={!canLogRough}>
                  Log
                </Button>
              ) : null
            ) : (
              <Button type="button" onClick={handleAddNew}>
                Add new
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <BottomNav active="calories" />
    </div>
  )
}
