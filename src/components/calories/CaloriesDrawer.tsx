import { useEffect, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '../ui/drawer'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  FOLLOWUP_SKIPPED_ANSWER,
  caloriesForGrams,
  type AgentEstimate,
  type CalorieEntry,
  type FollowUpQuestion,
  type Recipe,
} from '@/lib/caloriesUtils'
import { AddNewPanel } from './AddNewPanel'
import { DrawerFooterActions } from './DrawerFooterActions'
import { DrawerHeaderContent } from './DrawerHeaderContent'
import { EditEntryPanel } from './EditEntryPanel'
import { RecipeConfirmPanel } from './RecipeConfirmPanel'
import { RecipeListPanel } from './RecipeListPanel'

type CaloriesDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dayStartMs: number
  addContextLabel: string
  editEntry?: CalorieEntry | null
}

export function CaloriesDrawer({
  open,
  onOpenChange,
  dayStartMs,
  addContextLabel,
  editEntry,
}: CaloriesDrawerProps) {
  const recipes = useQuery(api.recipes.listRecipes) as Array<Recipe> | undefined
  const createEntry = useMutation(api.calorieEntries.createCalorieEntry)
  const updateEntry = useMutation(api.calorieEntries.updateCalorieEntry)
  const upsertRecipe = useMutation(api.recipes.upsertRecipe)
  const startEstimate = useAction(api.calorieAgent.startEstimate)
  const answerQuestions = useAction(api.calorieAgent.answerQuestions)
  const [recipeSearch, setRecipeSearch] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [gramsInput, setGramsInput] = useState('')
  const [drawerMode, setDrawerMode] = useState<'list' | 'addNew' | 'edit'>('list')
  const [addNewText, setAddNewText] = useState('')
  const [agentThreadId, setAgentThreadId] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<AgentEstimate | null>(null)
  const [estimateQuestions, setEstimateQuestions] = useState<
    Array<FollowUpQuestion>
  >([])
  const [estimateAnswers, setEstimateAnswers] = useState<
    Record<string, string | undefined>
  >({})
  const [estimateStep, setEstimateStep] = useState<
    'questions' | 'result' | null
  >(null)
  const [estimateStatus, setEstimateStatus] = useState<
    'idle' | 'estimating' | 'answering' | 'logging'
  >('idle')
  const [portionInput, setPortionInput] = useState('')
  const [portionKind, setPortionKind] = useState<'grams' | 'servings'>('grams')
  const [editDetails, setEditDetails] = useState('')
  const [editThreadId, setEditThreadId] = useState<string | null>(null)
  const [editEstimate, setEditEstimate] = useState<AgentEstimate | null>(null)
  const [editEstimateQuestions, setEditEstimateQuestions] = useState<
    Array<FollowUpQuestion>
  >([])
  const [editEstimateAnswers, setEditEstimateAnswers] = useState<
    Record<string, string | undefined>
  >({})
  const [editEstimateStep, setEditEstimateStep] = useState<
    'questions' | 'result' | null
  >(null)
  const [editPortionInput, setEditPortionInput] = useState('')
  const [editPortionKind, setEditPortionKind] = useState<'grams' | 'servings'>(
    'grams',
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
  const isAddNew = drawerMode === 'addNew'
  const isEdit = drawerMode === 'edit'

  const resetState = () => {
    setSelectedRecipeId(null)
    setRecipeSearch('')
    setGramsInput('')
    setDrawerMode('list')
    setAddNewText('')
    setAgentThreadId(null)
    setEstimate(null)
    setEstimateQuestions([])
    setEstimateAnswers({})
    setEstimateStep(null)
    setPortionInput('')
    setPortionKind('grams')
    setEstimateStatus('idle')
    setEditDetails('')
    setEditThreadId(null)
    setEditEstimate(null)
    setEditEstimateQuestions([])
    setEditEstimateAnswers({})
    setEditEstimateStep(null)
    setEditPortionInput('')
    setEditPortionKind('grams')
  }

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open])

  useEffect(() => {
    if (!selectedRecipe) return
    if (selectedRecipe.defaultServingGrams != null) {
      setGramsInput(String(selectedRecipe.defaultServingGrams))
    } else {
      setGramsInput('')
    }
  }, [selectedRecipe])

  useEffect(() => {
    if (!estimate && estimateQuestions.length === 0 && !estimateStep) return
    setAgentThreadId(null)
    setEstimate(null)
    setEstimateQuestions([])
    setEstimateAnswers({})
    setEstimateStep(null)
    setPortionInput('')
    setEstimateStatus('idle')
  }, [addNewText])

  useEffect(() => {
    if (!editEntry) return
    setSelectedRecipeId(null)
    setDrawerMode('edit')
    setEditDetails('')
    setEditThreadId(null)
    setEditEstimate(null)
    setEditEstimateQuestions([])
    setEditEstimateAnswers({})
    setEditEstimateStep(null)
    setEditPortionInput('')
    setEditPortionKind('grams')
    setEstimateStatus('idle')
  }, [editEntry])

  useEffect(() => {
    if (!estimate?.entry) return
    const grams = estimate.entry.grams ?? estimate.recipe?.defaultServingGrams
    if (grams && grams > 0) {
      setPortionKind('grams')
      setPortionInput(String(Math.round(grams)))
      return
    }
    const servings = estimate.entry.servings ?? estimate.recipe?.servings
    if (servings && servings > 0) {
      setPortionKind('servings')
      setPortionInput(String(servings))
      return
    }
    setPortionInput('')
  }, [estimate])

  useEffect(() => {
    if (!editEstimate?.entry) return
    const grams = editEstimate.entry.grams ?? editEstimate.recipe?.defaultServingGrams
    if (grams && grams > 0) {
      setEditPortionKind('grams')
      setEditPortionInput(String(Math.round(grams)))
      return
    }
    const servings = editEstimate.entry.servings ?? editEstimate.recipe?.servings
    if (servings && servings > 0) {
      setEditPortionKind('servings')
      setEditPortionInput(String(servings))
      return
    }
    setEditPortionInput('')
  }, [editEstimate])

  const parsedGrams = Number(gramsInput)
  const grams = Number.isFinite(parsedGrams) ? parsedGrams : 0
  const computedCalories = selectedRecipe
    ? caloriesForGrams({
        grams,
        defaultServingGrams: selectedRecipe.defaultServingGrams ?? null,
        caloriesPerServing: selectedRecipe.caloriesPerServing ?? null,
      })
    : 0
  const canLogRecipe =
    !!selectedRecipe && grams > 0 && computedCalories > 0 && !Number.isNaN(grams)
  const canRunAddNew = addNewText.trim().length > 0
  const parsedPortionInput = Number(portionInput)
  const portionValue = Number.isFinite(parsedPortionInput) ? parsedPortionInput : 0
  const baseCalories = estimate?.entry?.calories ?? 0
  const baseGrams =
    estimate?.entry?.grams ?? estimate?.recipe?.defaultServingGrams ?? null
  const baseServings =
    estimate?.entry?.servings ?? estimate?.recipe?.servings ?? null
  const portionCalories =
    estimate && portionValue > 0 && baseCalories > 0
      ? portionKind === 'grams'
        ? baseGrams && baseGrams > 0
          ? (baseCalories / baseGrams) * portionValue
          : baseCalories
        : baseServings && baseServings > 0
          ? (baseCalories / baseServings) * portionValue
          : baseCalories
      : 0
  const canLogEstimate =
    estimate != null &&
    portionValue > 0 &&
    portionCalories > 0 &&
    !Number.isNaN(portionCalories)
  const isDrawerBusy = estimateStatus !== 'idle'
  const parsedEditPortionInput = Number(editPortionInput)
  const editPortionValue = Number.isFinite(parsedEditPortionInput)
    ? parsedEditPortionInput
    : 0
  const editBaseCalories = editEstimate?.entry?.calories ?? 0
  const editBaseGrams =
    editEstimate?.entry?.grams ?? editEstimate?.recipe?.defaultServingGrams ?? null
  const editBaseServings =
    editEstimate?.entry?.servings ?? editEstimate?.recipe?.servings ?? null
  const editPortionCalories =
    editEstimate && editPortionValue > 0 && editBaseCalories > 0
      ? editPortionKind === 'grams'
        ? editBaseGrams && editBaseGrams > 0
          ? (editBaseCalories / editBaseGrams) * editPortionValue
          : editBaseCalories
        : editBaseServings && editBaseServings > 0
          ? (editBaseCalories / editBaseServings) * editPortionValue
          : editBaseCalories
      : 0
  const canSaveEditEstimate =
    editEstimate != null &&
    editPortionValue > 0 &&
    editPortionCalories > 0 &&
    !Number.isNaN(editPortionCalories)

  const handleAddNew = () => {
    setSelectedRecipeId(null)
    setDrawerMode('addNew')
  }

  const handleBackToList = () => {
    setSelectedRecipeId(null)
    setDrawerMode('list')
  }

  const buildEditInput = () => {
    if (!editEntry) return ''
    const parts = [editEntry.label.trim(), editDetails.trim()].filter(Boolean)
    return parts.join('\n')
  }

  const handleRunEstimate = async () => {
    const trimmed = addNewText.trim()
    if (!trimmed) {
      toast('Add a short description first.')
      return
    }
    setEstimate(null)
    setEstimateQuestions([])
    setEstimateAnswers({})
    setEstimateStep(null)
    setEstimateStatus('estimating')
    try {
      const result = await startEstimate({ input: trimmed })
      setAgentThreadId(result.threadId)
      const nextEstimate = result.estimate as AgentEstimate
      if (
        nextEstimate.status === 'needs_follow_up' &&
        nextEstimate.questions.length > 0
      ) {
        setEstimateQuestions(nextEstimate.questions)
        setEstimateStep('questions')
      } else {
        setEstimate(nextEstimate)
        setEstimateQuestions([])
        setEstimateStep('result')
      }
      setEstimateStatus('idle')
    } catch (error) {
      toast('Estimate failed. Try again.')
      setEstimateStatus('idle')
    }
  }

  const handleRunEditEstimate = async () => {
    if (!editEntry) return
    const trimmed = buildEditInput()
    if (!trimmed) {
      toast('Add a short description first.')
      return
    }
    setEditEstimate(null)
    setEditEstimateQuestions([])
    setEditEstimateAnswers({})
    setEditEstimateStep(null)
    setEstimateStatus('estimating')
    try {
      const result = await startEstimate({ input: trimmed })
      setEditThreadId(result.threadId)
      const nextEstimate = result.estimate as AgentEstimate
      if (
        nextEstimate.status === 'needs_follow_up' &&
        nextEstimate.questions.length > 0
      ) {
        setEditEstimateQuestions(nextEstimate.questions)
        setEditEstimateStep('questions')
      } else {
        setEditEstimate(nextEstimate)
        setEditEstimateQuestions([])
        setEditEstimateStep('result')
      }
      setEstimateStatus('idle')
    } catch (error) {
      toast('Estimate failed. Try again.')
      setEstimateStatus('idle')
    }
  }

  const handleAnswerChange = (id: string, value: string) => {
    setEstimateAnswers((prev) => ({ ...prev, [id]: value }))
  }

  const handleEditAnswerChange = (id: string, value: string) => {
    setEditEstimateAnswers((prev) => ({ ...prev, [id]: value }))
  }

  const handleSkipQuestion = (id: string) => {
    setEstimateAnswers((prev) => ({ ...prev, [id]: FOLLOWUP_SKIPPED_ANSWER }))
  }

  const handleEditSkipQuestion = (id: string) => {
    setEditEstimateAnswers((prev) => ({ ...prev, [id]: FOLLOWUP_SKIPPED_ANSWER }))
  }

  const submitAnswers = async (
    override?: Record<string, string | undefined>,
  ) => {
    const trimmed = addNewText.trim()
    if (!agentThreadId || !trimmed) return
    try {
      setEstimateStatus('answering')
      const normalizedAnswers = Object.fromEntries(
        Object.entries(override ?? estimateAnswers).map(([key, value]) => [
          key,
          value ?? '',
        ]),
      )
      const result = await answerQuestions({
        threadId: agentThreadId,
        input: trimmed,
        answers: normalizedAnswers,
      })
      const nextEstimate = result.estimate as AgentEstimate
      if (
        nextEstimate.status === 'needs_follow_up' &&
        nextEstimate.questions.length > 0
      ) {
        setEstimateQuestions(nextEstimate.questions)
        setEstimateStep('questions')
      } else {
        setEstimate(nextEstimate)
        setEstimateQuestions([])
        setEstimateStep('result')
      }
      setEstimateStatus('idle')
    } catch (error) {
      toast('Estimate failed. Try again.')
      setEstimateStatus('idle')
    }
  }

  const submitEditAnswers = async (
    override?: Record<string, string | undefined>,
  ) => {
    const trimmed = buildEditInput()
    if (!editThreadId || !trimmed) return
    try {
      setEstimateStatus('answering')
      const normalizedAnswers = Object.fromEntries(
        Object.entries(override ?? editEstimateAnswers).map(([key, value]) => [
          key,
          value ?? '',
        ]),
      )
      const result = await answerQuestions({
        threadId: editThreadId,
        input: trimmed,
        answers: normalizedAnswers,
      })
      const nextEstimate = result.estimate as AgentEstimate
      if (
        nextEstimate.status === 'needs_follow_up' &&
        nextEstimate.questions.length > 0
      ) {
        setEditEstimateQuestions(nextEstimate.questions)
        setEditEstimateStep('questions')
      } else {
        setEditEstimate(nextEstimate)
        setEditEstimateQuestions([])
        setEditEstimateStep('result')
      }
      setEstimateStatus('idle')
    } catch (error) {
      toast('Estimate failed. Try again.')
      setEstimateStatus('idle')
    }
  }

  const handleSkipAll = async () => {
    const skippedAnswers: Record<string, string> = {}
    estimateQuestions.forEach((question) => {
      skippedAnswers[question.id] = FOLLOWUP_SKIPPED_ANSWER
    })
    setEstimateAnswers((prev) => ({ ...prev, ...skippedAnswers }))
    await submitAnswers(skippedAnswers)
  }

  const handleEditSkipAll = async () => {
    const skippedAnswers: Record<string, string> = {}
    editEstimateQuestions.forEach((question) => {
      skippedAnswers[question.id] = FOLLOWUP_SKIPPED_ANSWER
    })
    setEditEstimateAnswers((prev) => ({ ...prev, ...skippedAnswers }))
    await submitEditAnswers(skippedAnswers)
  }

  const handleFinalize = async () => {
    await submitAnswers()
  }

  const handleEditFinalize = async () => {
    await submitEditAnswers()
  }

  const handleLogRecipe = async () => {
    if (!selectedRecipe) return
    if (!canLogRecipe) {
      toast('Add grams to log this recipe.')
      return
    }
    setEstimateStatus('logging')
    try {
      await createEntry({
        dayStartMs,
        label: selectedRecipe.name,
        calories: Math.round(computedCalories),
        grams,
      })
      toast('Recipe logged.')
      onOpenChange(false)
    } catch (error) {
      toast('Log failed. Try again.')
    } finally {
      setEstimateStatus('idle')
    }
  }

  const handleLogEstimate = async () => {
    if (!estimate?.entry) return
    if (!canLogEstimate) {
      toast('Add a portion to log this entry.')
      return
    }
    setEstimateStatus('logging')
    try {
      const trimmedLabel = addNewText.trim()
      const recipeName = estimate.recipe?.name?.trim()
      const entryLabel = estimate.entry.label?.trim()
      const label = trimmedLabel || recipeName || entryLabel || 'Meal'
      if (estimate.recipe?.name) {
        await upsertRecipe({
          name: estimate.recipe.name,
          description: estimate.recipe.description ?? undefined,
          ingredients: estimate.recipe.ingredients ?? undefined,
          defaultServingGrams: estimate.recipe.defaultServingGrams ?? undefined,
          caloriesPerServing: estimate.recipe.caloriesPerServing ?? undefined,
        })
      }
      await createEntry({
        dayStartMs,
        label,
        calories: Math.round(portionCalories),
        grams: portionKind === 'grams' ? portionValue : undefined,
        servings: portionKind === 'servings' ? portionValue : undefined,
      })
      toast('Entry logged.')
      onOpenChange(false)
    } catch (error) {
      toast('Log failed. Try again.')
    } finally {
      setEstimateStatus('idle')
    }
  }

  const upsertEstimateRecipe = async (nextEstimate: AgentEstimate | null) => {
    if (!nextEstimate?.recipe?.name) return
    await upsertRecipe({
      name: nextEstimate.recipe.name,
      description: nextEstimate.recipe.description ?? undefined,
      ingredients: nextEstimate.recipe.ingredients ?? undefined,
      defaultServingGrams: nextEstimate.recipe.defaultServingGrams ?? undefined,
      caloriesPerServing: nextEstimate.recipe.caloriesPerServing ?? undefined,
    })
  }

  const handleOverwriteEdit = async () => {
    if (!editEntry || !editEstimate?.entry) return
    if (!canSaveEditEstimate) {
      toast('Add a portion to update this entry.')
      return
    }
    setEstimateStatus('logging')
    try {
      const entryLabel = editEstimate.entry.label?.trim()
      const label = entryLabel || editEntry.label
      await upsertEstimateRecipe(editEstimate)
      await updateEntry({
        id: editEntry._id as Id<'calorieEntries'>,
        label,
        calories: Math.round(editPortionCalories),
        grams: editPortionKind === 'grams' ? editPortionValue : undefined,
        servings: editPortionKind === 'servings' ? editPortionValue : undefined,
      })
      toast('Entry updated.')
      onOpenChange(false)
    } catch (error) {
      toast('Update failed. Try again.')
    } finally {
      setEstimateStatus('idle')
    }
  }

  const handleCreateFromEdit = async () => {
    if (!editEstimate?.entry) return
    if (!canSaveEditEstimate) {
      toast('Add a portion to log this entry.')
      return
    }
    setEstimateStatus('logging')
    try {
      const entryLabel = editEstimate.entry.label?.trim()
      const label = entryLabel || editEntry?.label || 'Meal'
      await upsertEstimateRecipe(editEstimate)
      await createEntry({
        dayStartMs,
        label,
        calories: Math.round(editPortionCalories),
        grams: editPortionKind === 'grams' ? editPortionValue : undefined,
        servings: editPortionKind === 'servings' ? editPortionValue : undefined,
      })
      toast('Entry logged.')
      onOpenChange(false)
    } catch (error) {
      toast('Log failed. Try again.')
    } finally {
      setEstimateStatus('idle')
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent
        className="border-border bg-card"
        role="dialog"
        aria-label="Add entry"
      >
        <DrawerHeader>
          <DrawerHeaderContent
            selectedRecipe={selectedRecipe}
            isAddNew={isAddNew}
            isEditMode={isEdit}
            addContextLabel={addContextLabel}
            onBackToList={handleBackToList}
          />
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {selectedRecipe ? (
            <RecipeConfirmPanel
              recipe={selectedRecipe}
              gramsInput={gramsInput}
              onGramsChange={setGramsInput}
              computedCalories={computedCalories}
            />
          ) : isAddNew ? (
            <AddNewPanel
              addNewText={addNewText}
              onAddNewTextChange={setAddNewText}
              canRunAddNew={canRunAddNew}
              onRunEstimate={handleRunEstimate}
              estimateStep={estimateStep}
              questions={estimateQuestions}
              answers={estimateAnswers}
              onAnswerChange={handleAnswerChange}
              onSkipQuestion={handleSkipQuestion}
              onSkipAll={handleSkipAll}
              onFinalize={handleFinalize}
              estimate={estimate}
              portionInput={portionInput}
              onPortionChange={setPortionInput}
              portionCalories={portionCalories}
              portionKind={portionKind}
              estimateStatus={estimateStatus}
            />
          ) : isEdit && editEntry ? (
            <EditEntryPanel
              entry={editEntry}
              details={editDetails}
              onDetailsChange={setEditDetails}
              canRunEstimate={buildEditInput().length > 0}
              onRunEstimate={handleRunEditEstimate}
              estimateStep={editEstimateStep}
              questions={editEstimateQuestions}
              answers={editEstimateAnswers}
              onAnswerChange={handleEditAnswerChange}
              onSkipQuestion={handleEditSkipQuestion}
              onSkipAll={handleEditSkipAll}
              onFinalize={handleEditFinalize}
              estimate={editEstimate}
              portionInput={editPortionInput}
              onPortionChange={setEditPortionInput}
              portionCalories={editPortionCalories}
              portionKind={editPortionKind}
              estimateStatus={estimateStatus}
              canSaveEstimate={canSaveEditEstimate}
              onOverwrite={handleOverwriteEdit}
              onCreateNew={handleCreateFromEdit}
            />
          ) : (
            <RecipeListPanel
              recipeSearch={recipeSearch}
              onRecipeSearchChange={setRecipeSearch}
              recipes={recipes}
              visibleRecipes={visibleRecipes}
              normalizedSearch={normalizedSearch}
              onRecipeSelect={(id) => {
                setSelectedRecipeId(id)
                setDrawerMode('list')
              }}
            />
          )}
        </div>
        <DrawerFooter className="flex-row justify-between border-t border-border pt-4">
          <DrawerClose asChild>
            <Button variant="secondary" aria-label="Close drawer">
              Close
            </Button>
          </DrawerClose>
          <DrawerFooterActions
            selectedRecipe={selectedRecipe}
            isAddNew={isAddNew}
            canLogRecipe={canLogRecipe}
            canLogEstimate={canLogEstimate}
            hasEstimate={estimate != null}
            isLoading={isDrawerBusy}
            isEditMode={isEdit}
            onLogRecipe={handleLogRecipe}
            onLogEstimate={handleLogEstimate}
            onAddNew={handleAddNew}
          />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
