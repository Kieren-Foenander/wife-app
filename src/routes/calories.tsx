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
}

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
    return {
      calories: estimate,
      label: primaryLabel,
      basis: 'matched',
    }
  }

  const fallbackMin = 350
  const fallbackMax = 700
  const fallbackEstimate = Math.round(((fallbackMin + fallbackMax) / 2) * 1.1)
  return {
    calories: fallbackEstimate,
    label: buildRoughLabel(input),
    basis: 'fallback',
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
    toast('Accurate estimate coming soon.')
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
            ) : isAddNew ? null : (
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
