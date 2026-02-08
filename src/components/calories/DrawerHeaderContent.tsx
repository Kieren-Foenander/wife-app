import { Button } from '../ui/button'
import { DrawerTitle } from '../ui/drawer'
import { type Recipe } from '@/lib/caloriesUtils'

type DrawerHeaderContentProps = {
  selectedRecipe: Recipe | null
  isAddNew: boolean
  isEditMode: boolean
  addContextLabel: string
  onBackToList: () => void
}

export function DrawerHeaderContent({
  selectedRecipe,
  isAddNew,
  isEditMode,
  addContextLabel,
  onBackToList,
}: DrawerHeaderContentProps) {
  const title = selectedRecipe
    ? 'Confirm entry'
    : isEditMode
      ? 'Edit entry'
      : isAddNew
        ? 'Add new'
        : 'Add entry'
  const showBack = selectedRecipe || isAddNew || isEditMode

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <DrawerTitle className="text-foreground">
          {title}
        </DrawerTitle>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Logging for {addContextLabel}
        </p>
      </div>
      {showBack ? (
        <Button
          type="button"
          variant="ghost"
          className="h-auto px-0 text-sm text-muted-foreground"
          onClick={onBackToList}
        >
          Back to list
        </Button>
      ) : null}
    </div>
  )
}
