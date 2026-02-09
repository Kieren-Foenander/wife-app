import {
  formatCalories,
  formatNumber,
  type AgentEstimate,
} from '../../lib/caloriesUtils'

type AgentEstimateCardProps = {
  estimate: AgentEstimate
  portionInput: string
  onPortionChange: (value: string) => void
  portionCalories: number
  portionKind: 'grams' | 'servings'
}

export function AgentEstimateCard({
  estimate,
  portionInput,
  onPortionChange,
  portionCalories,
  portionKind,
}: AgentEstimateCardProps) {
  const entryLabel = estimate.entry?.label ?? 'Meal'
  const recipe = estimate.recipe
  const baseCalories = estimate.entry?.calories ?? 0
  const portionLabel = portionKind === 'grams' ? 'Serving size (grams)' : 'Servings'
  const portionPlaceholder =
    portionKind === 'grams' ? 'Enter grams per serving' : 'Enter servings'

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        AI estimate
      </p>
      <p className="mt-2 text-3xl font-semibold text-foreground">
        {formatCalories(baseCalories)} kcal
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{entryLabel}</p>
      {recipe ? (
        <div className="mt-3 rounded-xl border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Recipe
          </p>
          <p className="mt-2 font-medium text-foreground">{recipe.name}</p>
          {recipe.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {recipe.description}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 rounded-xl border border-border/70 bg-background/70 p-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Confirm portion
        </p>
        <label
          htmlFor="ai-serving-portion"
          className="mt-2 block text-sm font-medium text-muted-foreground"
        >
          {portionLabel}
        </label>
        <input
          id="ai-serving-portion"
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          value={portionInput}
          onChange={(e) => onPortionChange(e.target.value)}
          placeholder={portionPlaceholder}
          className="mt-2 h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Calories for this entry</span>
          <span className="text-base font-semibold text-foreground">
            {formatCalories(portionCalories)} kcal
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {portionKind === 'grams'
            ? 'Adjust grams before logging.'
            : 'Adjust servings before logging.'}
        </p>
      </div>
      {recipe?.ingredients ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Details
          </summary>
          <div className="mt-2 space-y-3 text-sm text-muted-foreground">
            <p>{recipe.ingredients}</p>
          </div>
        </details>
      ) : null}
      {estimate.assumptions.length > 0 || estimate.notes.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Assumptions & notes
          </summary>
          <div className="mt-2 space-y-3 text-sm text-muted-foreground">
            {estimate.assumptions.length > 0 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Assumptions
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {estimate.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {estimate.notes.length > 0 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Notes
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {estimate.notes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
      {estimate.entry?.grams != null && estimate.entry?.servings != null ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Base portion: {formatNumber(estimate.entry.grams)} g ·{' '}
          {formatNumber(estimate.entry.servings, 2)} servings
        </p>
      ) : null}
    </div>
  )
}
