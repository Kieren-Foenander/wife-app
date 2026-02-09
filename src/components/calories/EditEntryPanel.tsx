import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import {
  formatCalories,
  formatPortion,
  type AgentEstimate,
  type CalorieEntry,
  type FollowUpQuestion,
} from '@/lib/caloriesUtils'
import { AccurateQuestionsCard } from './AccurateQuestionsCard'
import { AgentEstimateCard } from './AgentEstimateCard'

type EditEntryPanelProps = {
  entry: CalorieEntry
  details: string
  onDetailsChange: (value: string) => void
  canRunEstimate: boolean
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
  canSaveEstimate: boolean
  onOverwrite: () => void
  onCreateNew: () => void
}

export function EditEntryPanel({
  entry,
  details,
  onDetailsChange,
  canRunEstimate,
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
  canSaveEstimate,
  onOverwrite,
  onCreateNew,
}: EditEntryPanelProps) {
  const isEstimating = estimateStatus === 'estimating'
  const isAnswering = estimateStatus === 'answering'
  const isLogging = estimateStatus === 'logging'
  const isLoading = isEstimating || isAnswering
  const statusLabel = isEstimating
    ? 'Estimating calories...'
    : isAnswering
      ? 'Updating estimate...'
      : isLogging
        ? 'Saving entry...'
        : null

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div className="rounded-2xl border border-border bg-card/70 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Editing entry
        </p>
        <p className="mt-2 text-lg font-semibold text-foreground">
          {entry.label}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatPortion(entry)}</span>
          <span aria-hidden="true">•</span>
          <span>{formatCalories(entry.calories)} kcal</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-4">
        <label
          htmlFor="edit-entry-details"
          className="mb-2 block text-sm font-medium text-muted-foreground"
        >
          Add details for a better estimate
        </label>
        <textarea
          id="edit-entry-details"
          value={details}
          onChange={(e) => onDetailsChange(e.target.value)}
          placeholder="e.g. Added 2 tbsp olive oil, extra rice"
          rows={3}
          className="min-h-[80px] w-full rounded-md border border-input bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          This won&apos;t change the original entry unless you overwrite.
        </p>
      </div>

      <div className="grid gap-2">
        <Button
          type="button"
          onClick={onRunEstimate}
          disabled={!canRunEstimate || isLoading || isLogging}
        >
          {isEstimating ? 'Estimating...' : 'Recalculate'}
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
          isLoading={isLoading || isLogging}
        />
      ) : null}
      {estimate ? (
        <>
          <AgentEstimateCard
            estimate={estimate}
            portionInput={portionInput}
            onPortionChange={onPortionChange}
            portionCalories={portionCalories}
            portionKind={portionKind}
          />
          <div className="grid gap-2 md:grid-cols-2">
            <Button
              type="button"
              onClick={onOverwrite}
              disabled={!canSaveEstimate || isLogging}
            >
              {isLogging ? 'Saving...' : 'Overwrite entry'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onCreateNew}
              disabled={!canSaveEstimate || isLogging}
            >
              {isLogging ? 'Saving...' : 'Create new entry'}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
