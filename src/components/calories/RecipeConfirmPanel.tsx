import { Button } from '../ui/button'
import { formatCalories, type Recipe } from '@/lib/caloriesUtils'

type RecipeConfirmPanelProps = {
  recipe: Recipe
  gramsInput: string
  onGramsChange: (value: string) => void
  computedCalories: number
  isBusy: boolean
  onRecalculate: () => void
}

export function RecipeConfirmPanel({
  recipe,
  gramsInput,
  onGramsChange,
  computedCalories,
  isBusy,
  onRecalculate,
}: RecipeConfirmPanelProps) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div className="rounded-2xl border border-border bg-card/70 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Recipe
        </p>
        <p className="mt-2 text-lg font-semibold text-foreground">
          {recipe.name}
        </p>
        {recipe.description ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {recipe.description}
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
          onChange={(e) => onGramsChange(e.target.value)}
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
            {recipe.ingredients ? <p>{recipe.ingredients}</p> : null}
            {!recipe.ingredients ? (
              <p>No extra details saved for this recipe yet.</p>
            ) : null}
          </div>
        </details>
      </div>
      <div className="rounded-2xl border border-border bg-card/70 p-4">
        <p className="text-sm font-medium text-foreground">Need a new estimate?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use AI if this meal changed from last time.
        </p>
        <Button
          type="button"
          className="mt-3 w-full"
          onClick={onRecalculate}
          disabled={isBusy}
        >
          Recalculate with AI
        </Button>
      </div>
    </div>
  )
}
