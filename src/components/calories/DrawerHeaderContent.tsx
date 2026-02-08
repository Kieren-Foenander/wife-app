import { Button } from '../ui/button'
import { DrawerTitle } from '../ui/drawer'
import { type Recipe } from '@/lib/caloriesUtils'

type DrawerHeaderContentProps = {
  selectedRecipe: Recipe | null
  isAddNew: boolean
  addContextLabel: string
  onBackToList: () => void
}

export function DrawerHeaderContent({
  selectedRecipe,
  isAddNew,
  addContextLabel,
  onBackToList,
}: DrawerHeaderContentProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <DrawerTitle className="text-foreground">
          {selectedRecipe ? 'Confirm entry' : isAddNew ? 'Add new' : 'Add entry'}
        </DrawerTitle>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Logging for {addContextLabel}
        </p>
      </div>
      {selectedRecipe || isAddNew ? (
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
