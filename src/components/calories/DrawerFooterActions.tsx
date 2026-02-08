import { Button } from '../ui/button'
import { type Recipe } from '@/lib/caloriesUtils'

type DrawerFooterActionsProps = {
  selectedRecipe: Recipe | null
  isAddNew: boolean
  canLogRecipe: boolean
  canLogEstimate: boolean
  hasEstimate: boolean
  isLoading: boolean
  isEditMode: boolean
  onLogRecipe: () => void
  onLogEstimate: () => void
  onAddNew: () => void
}

export function DrawerFooterActions({
  selectedRecipe,
  isAddNew,
  canLogRecipe,
  canLogEstimate,
  hasEstimate,
  isLoading,
  isEditMode,
  onLogRecipe,
  onLogEstimate,
  onAddNew,
}: DrawerFooterActionsProps) {
  if (isEditMode) {
    return null
  }
  if (selectedRecipe) {
    return (
      <Button
        type="button"
        onClick={onLogRecipe}
        disabled={!canLogRecipe || isLoading}
      >
        {isLoading ? 'Logging...' : 'Log'}
      </Button>
    )
  }

  if (isAddNew) {
    if (hasEstimate) {
      return (
        <Button
          type="button"
          onClick={onLogEstimate}
          disabled={!canLogEstimate || isLoading}
        >
          {isLoading ? 'Logging...' : 'Log'}
        </Button>
      )
    }

    return null
  }

  return (
    <Button type="button" onClick={onAddNew} disabled={isLoading}>
      Add new
    </Button>
  )
}
