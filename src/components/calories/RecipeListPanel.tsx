import { ListRowSkeleton } from '../ui/skeleton'
import { type Recipe } from '@/lib/caloriesUtils'

type RecipeListPanelProps = {
  recipeSearch: string
  onRecipeSearchChange: (value: string) => void
  recipes: Array<Recipe> | undefined
  visibleRecipes: Array<Recipe>
  normalizedSearch: string
  onRecipeSelect: (id: string) => void
}

export function RecipeListPanel({
  recipeSearch,
  onRecipeSearchChange,
  recipes,
  visibleRecipes,
  normalizedSearch,
  onRecipeSelect,
}: RecipeListPanelProps) {
  return (
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
          onChange={(e) => onRecipeSearchChange(e.target.value)}
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
            <p className="text-xs text-muted-foreground">Most used first</p>
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
                    onClick={() => onRecipeSelect(recipe._id)}
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
                      {recipe.usageCount ?? 0} uses
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
