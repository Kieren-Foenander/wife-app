import { Button } from '../ui/button'
import {
  FOLLOWUP_SKIPPED_ANSWER,
  type FollowUpQuestion,
} from '@/lib/caloriesUtils'

type AccurateQuestionsCardProps = {
  questions: Array<FollowUpQuestion>
  answers: Record<string, string | undefined>
  onAnswerChange: (id: string, value: string) => void
  onSkipQuestion: (id: string) => void
  onSkipAll: () => void
  onFinalize: () => void
}

export function AccurateQuestionsCard({
  questions,
  answers,
  onAnswerChange,
  onSkipQuestion,
  onSkipAll,
  onFinalize,
}: AccurateQuestionsCardProps) {
  return (
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
          onClick={onSkipAll}
        >
          Use best guess
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {questions.map((question) => {
          const answer = answers[question.id]
          const isSkipped = answer === FOLLOWUP_SKIPPED_ANSWER
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
                  onChange={(e) => onAnswerChange(question.id, e.target.value)}
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
                        onClick={() => onAnswerChange(question.id, option)}
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
                  onClick={() => onSkipQuestion(question.id)}
                  disabled={isSkipped}
                >
                  Skip / Use best guess
                </Button>
                {isSkipped ? (
                  <span className="text-xs text-muted-foreground">Skipped</span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      <Button
        type="button"
        className="mt-4 w-full"
        onClick={onFinalize}
      >
        Get estimate
      </Button>
    </div>
  )
}
