import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { type AgentEstimate, type FollowUpQuestion } from '@/lib/caloriesUtils'
import { AccurateQuestionsCard } from './AccurateQuestionsCard'
import { AgentEstimateCard } from './AgentEstimateCard'

type AddNewPanelProps = {
  addNewText: string
  onAddNewTextChange: (value: string) => void
  canRunAddNew: boolean
  onRunEstimate: () => void
  estimateStep: 'questions' | 'result' | null
  questions: Array<FollowUpQuestion>
  answers: Record<string, string | undefined>
  onAnswerChange: (id: string, value: string) => void
  onSkipQuestion: (id: string) => void
  onSkipAll: () => void
  onFinalize: () => void
  estimate: AgentEstimate | null
  portionInput: string
  onPortionChange: (value: string) => void
  portionCalories: number
  portionKind: 'grams' | 'servings'
  estimateStatus: 'idle' | 'estimating' | 'answering' | 'logging'
}

export function AddNewPanel({
  addNewText,
  onAddNewTextChange,
  canRunAddNew,
  onRunEstimate,
  estimateStep,
  questions,
  answers,
  onAnswerChange,
  onSkipQuestion,
  onSkipAll,
  onFinalize,
  estimate,
  portionInput,
  onPortionChange,
  portionCalories,
  portionKind,
  estimateStatus,
}: AddNewPanelProps) {
  const isEstimating = estimateStatus === 'estimating'
  const isAnswering = estimateStatus === 'answering'
  const isLoading = isEstimating || isAnswering
  const statusLabel = isEstimating
    ? 'Estimating calories...'
    : isAnswering
      ? 'Updating estimate...'
      : null

  return (
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
          onChange={(e) => onAddNewTextChange(e.target.value)}
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
          onClick={onRunEstimate}
          disabled={!canRunAddNew || isLoading}
        >
          {isEstimating ? 'Estimating...' : 'Get estimate'}
        </Button>
      </div>
      {statusLabel ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner aria-label={statusLabel} size={16} />
          <span>{statusLabel}</span>
        </div>
      ) : null}
      {estimateStep === 'questions' && questions.length > 0 ? (
        <AccurateQuestionsCard
          questions={questions}
          answers={answers}
          onAnswerChange={onAnswerChange}
          onSkipQuestion={onSkipQuestion}
          onSkipAll={onSkipAll}
          onFinalize={onFinalize}
          isLoading={isLoading}
        />
      ) : null}
      {estimate ? (
        <AgentEstimateCard
          estimate={estimate}
          portionInput={portionInput}
          onPortionChange={onPortionChange}
          portionCalories={portionCalories}
          portionKind={portionKind}
        />
      ) : null}
    </div>
  )
}
