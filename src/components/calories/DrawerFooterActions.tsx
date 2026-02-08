import { Button } from '../ui/button'
import { type Recipe } from '@/lib/caloriesUtils'

type DrawerFooterActionsProps = {
  selectedRecipe: Recipe | null
  isAddNew: boolean
  canLogRecipe: boolean
  canLogEstimate: boolean
  hasEstimate: boolean
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
  onLogRecipe,
  onLogEstimate,
  onAddNew,
}: DrawerFooterActionsProps) {
  if (selectedRecipe) {
    return (
      <Button type="button" onClick={onLogRecipe} disabled={!canLogRecipe}>
        Log
      </Button>
    )
  }

  if (isAddNew) {
    if (hasEstimate) {
      return (
        <Button type="button" onClick={onLogEstimate} disabled={!canLogEstimate}>
          Log
        </Button>
      )
    }

    return null
  }

  return (
    <Button type="button" onClick={onAddNew}>
      Add new
    </Button>
  )
}
