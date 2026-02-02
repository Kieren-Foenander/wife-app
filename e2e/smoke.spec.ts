import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

async function waitForDueDate(drawer: Locator) {
  await expect(drawer.getByLabel('Due date')).toHaveValue(/\d{4}-\d{2}-\d{2}/)
}

test.describe('Daily view smoke', () => {
  test('app loads and shows Daily view', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Tasks', level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('Wife App')).toBeVisible()
    await expect(page.getByText(/Today - \w+/)).toBeVisible()
  })

  test('view mode toggle switches Day/Week/Month', async ({ page }) => {
    await page.goto('/')
    const tablist = page.getByRole('tablist', { name: 'View mode' })
    await expect(tablist).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Day', selected: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Week', selected: false })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Month', selected: false })).toBeVisible()
    await expect(page.getByText(/Today - \w+/)).toBeVisible()
    await page.getByRole('tab', { name: 'Week' }).click()
    await expect(page.getByRole('tab', { name: 'Week', selected: true })).toBeVisible()
    await expect(page.getByText('Weekly')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Week' })).toBeVisible()
    await page.getByRole('tab', { name: 'Month' }).click()
    await expect(page.getByRole('tab', { name: 'Month', selected: true })).toBeVisible()
    await expect(page.getByText('Monthly')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Month' })).toBeVisible()
    await page.getByRole('tab', { name: 'Day' }).click()
    await expect(page.getByRole('tab', { name: 'Day', selected: true })).toBeVisible()
    await expect(page.getByText(/Today - \w+/)).toBeVisible()
  })

  test('task creation drawer shows task form', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Add task' }).click()
    const drawer = page.getByRole('dialog', { name: 'Add task' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByLabel('Task title')).toBeVisible()
    await expect(drawer.getByPlaceholder(/pay rent/i)).toBeVisible()
    await expect(drawer.getByLabel('Parent task')).toHaveCount(0)
    await expect(drawer.getByLabel('Due date')).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Add task' })).toBeVisible()
  })

  test('task completion toggle works', async ({ page }) => {
    test.setTimeout(60_000)
    const taskTitle = `Pay bills ${Date.now()}`
    await page.goto('/')
    await page.getByRole('button', { name: 'Add task' }).click()
    const drawer = page.getByRole('dialog', { name: 'Add task' })
    await expect(drawer).toBeVisible()
    await drawer.getByPlaceholder(/pay rent/i).fill(taskTitle)
    await waitForDueDate(drawer)
    await drawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(drawer).not.toBeVisible({ timeout: 45000 })
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 45000 })

    const checkbox = page.getByLabel(`Mark ${taskTitle} complete`)
    await expect(checkbox).not.toBeChecked()
    await checkbox.click()
    await expect(checkbox).toBeChecked({ timeout: 25000 })
    const taskLink = page.getByRole('link', { name: taskTitle })
    await expect(taskLink).toBeVisible()
    await expect(taskLink).toHaveClass(/line-through/)
  })

  test('task detail shows sub-tasks and completion indicator', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const rootTaskName = `Projects ${Date.now()}`
    const taskOne = `Draft plan ${Date.now()}`

    await page.goto('/')
    await page.getByRole('button', { name: 'Add task' }).click()
    const rootDrawer = page.getByRole('dialog', { name: 'Add task' })
    await rootDrawer.getByPlaceholder(/pay rent/i).fill(rootTaskName)
    await waitForDueDate(rootDrawer)
    await rootDrawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    const taskLink = page.getByRole('link', { name: rootTaskName })
    await expect(taskLink).toBeVisible({ timeout: 45000 })
    await taskLink.click()
    await page.waitForURL(/\/tasks\//)
    await expect(
      page.getByRole('heading', { name: rootTaskName }),
    ).toBeVisible({ timeout: 45000 })

    await page.getByRole('button', { name: 'Add sub-task' }).click()
    const subTaskDrawer = page.getByRole('dialog', { name: 'Add sub-task' })
    const parentField = subTaskDrawer.getByLabel('Parent task')
    await expect(parentField).toBeVisible()
    await expect(parentField).toBeDisabled()
    await expect(parentField).toHaveValue(rootTaskName)
    await subTaskDrawer.getByPlaceholder(/pay rent/i).fill(taskOne)
    await waitForDueDate(subTaskDrawer)
    await subTaskDrawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(page.getByRole('link', { name: taskOne })).toBeVisible()

    const taskCheckbox = page.getByLabel(`Mark ${taskOne} complete`)
    await taskCheckbox.check()
    await expect(taskCheckbox).toBeChecked()
    const completionIndicator = page.getByTestId('task-completion')
    await expect(completionIndicator.getByText('2/2 done')).toBeVisible({
      timeout: 45000,
    })
    await expect(completionIndicator.getByText('Completed')).toBeVisible({
      timeout: 45000,
    })
  })

  test('sub-task completion syncs parent completion', async ({ page }) => {
    test.setTimeout(90_000)
    const rootTaskName = `Sync ${Date.now()}`
    const taskOne = `First ${Date.now()}`
    const taskTwo = `Second ${Date.now()}`

    await page.goto('/')
    await page.getByRole('button', { name: 'Add task' }).click()
    const rootDrawer = page.getByRole('dialog', { name: 'Add task' })
    await rootDrawer.getByPlaceholder(/pay rent/i).fill(rootTaskName)
    await waitForDueDate(rootDrawer)
    await rootDrawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    const taskLink = page.getByRole('link', { name: rootTaskName })
    await expect(taskLink).toBeVisible({ timeout: 45000 })
    await taskLink.click()
    await page.waitForURL(/\/tasks\//)

    await page.getByRole('button', { name: 'Add sub-task' }).click()
    let subTaskDrawer = page.getByRole('dialog', { name: 'Add sub-task' })
    await subTaskDrawer.getByPlaceholder(/pay rent/i).fill(taskOne)
    await waitForDueDate(subTaskDrawer)
    await subTaskDrawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    await page.getByRole('button', { name: 'Add sub-task' }).click()
    subTaskDrawer = page.getByRole('dialog', { name: 'Add sub-task' })
    await subTaskDrawer.getByPlaceholder(/pay rent/i).fill(taskTwo)
    await waitForDueDate(subTaskDrawer)
    await subTaskDrawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())

    const firstCheckbox = page.getByLabel(`Mark ${taskOne} complete`)
    const secondCheckbox = page.getByLabel(`Mark ${taskTwo} complete`)
    await firstCheckbox.check()
    await secondCheckbox.check()

    const completionIndicator = page.getByTestId('task-completion')
    await expect(completionIndicator.getByText('3/3 done')).toBeVisible({
      timeout: 45000,
    })
    await expect(completionIndicator.getByText('Completed')).toBeVisible({
      timeout: 45000,
    })

    await firstCheckbox.uncheck()
    await expect(completionIndicator.getByText('1/3 done')).toBeVisible({
      timeout: 45000,
    })
    await expect(completionIndicator.getByText('Partial')).toBeVisible({
      timeout: 45000,
    })
  })

  test('complete all marks descendant tasks complete', async ({ page }) => {
    const rootTaskName = `Bulk ${Date.now()}`
    const taskA = `Task A ${Date.now()}`
    const taskB = `Task B ${Date.now()}`

    await page.goto('/')
    await page.getByRole('button', { name: 'Add task' }).click()
    const rootDrawer = page.getByRole('dialog', { name: 'Add task' })
    await rootDrawer.getByPlaceholder(/pay rent/i).fill(rootTaskName)
    await waitForDueDate(rootDrawer)
    await rootDrawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    const taskLink = page.getByRole('link', { name: rootTaskName })
    await expect(taskLink).toBeVisible({ timeout: 45000 })
    await taskLink.click()
    await page.waitForURL(/\/tasks\//)
    await expect(
      page.getByRole('heading', { name: rootTaskName }),
    ).toBeVisible({ timeout: 45000 })

    await page.getByRole('button', { name: 'Add sub-task' }).click()
    let subTaskDrawer = page.getByRole('dialog', { name: 'Add sub-task' })
    await subTaskDrawer.getByPlaceholder(/pay rent/i).fill(taskA)
    await waitForDueDate(subTaskDrawer)
    await subTaskDrawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    await page.getByRole('button', { name: 'Add sub-task' }).click()
    subTaskDrawer = page.getByRole('dialog', { name: 'Add sub-task' })
    await subTaskDrawer.getByPlaceholder(/pay rent/i).fill(taskB)
    await waitForDueDate(subTaskDrawer)
    await subTaskDrawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(page.getByRole('link', { name: taskA })).toBeVisible()
    await expect(page.getByRole('link', { name: taskB })).toBeVisible()

    const bulkCompleteButton = page.getByRole('button', { name: 'Complete all' })
    await expect(bulkCompleteButton).toBeVisible({ timeout: 45000 })
    await expect(bulkCompleteButton).toBeEnabled()
    await bulkCompleteButton.click()
    await expect(page.getByLabel(`Mark ${taskA} complete`)).toBeChecked()
    await expect(page.getByLabel(`Mark ${taskB} complete`)).toBeChecked({
      timeout: 10000,
    })
  })

  test('task link opens detail route', async ({ page }) => {
    const rootTaskName = `Chores ${Date.now()}`
    const childTaskTitle = `Vacuum ${Date.now()}`
    await page.goto('/')
    await page.getByRole('button', { name: 'Add task' }).click()
    const rootDrawer = page.getByRole('dialog', { name: 'Add task' })
    await rootDrawer.getByPlaceholder(/pay rent/i).fill(rootTaskName)
    await waitForDueDate(rootDrawer)
    await rootDrawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    const taskNavLink = page.getByRole('link', { name: rootTaskName })
    await expect(taskNavLink).toBeVisible({ timeout: 45000 })
    await taskNavLink.click()
    await page.waitForURL(/\/tasks\//)
    await expect(
      page.getByRole('heading', { name: rootTaskName }),
    ).toBeVisible({ timeout: 45000 })
    await expect(page.getByText('Task', { exact: true })).toBeVisible()
    const breadcrumb = page.locator('nav', { hasText: 'Daily' })
    await expect(breadcrumb.getByRole('link', { name: 'Daily' })).toBeVisible()
    await expect(breadcrumb).toContainText(rootTaskName)
    await expect(
      page.getByRole('heading', { name: /sub-tasks/i }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Add sub-task' }).click()
    const taskDrawer = page.getByRole('dialog', { name: 'Add sub-task' })
    await taskDrawer.getByPlaceholder(/pay rent/i).fill(childTaskTitle)
    await page.getByRole('button', { name: 'Add task' }).click()
    await expect(page.getByRole('link', { name: childTaskTitle })).toBeVisible()
  })

  test('selecting a day in week view keeps view and uses it for due date', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.goto('/')
    await page.getByRole('tab', { name: 'Week' }).click()
    await expect(page.getByRole('region', { name: 'Week' })).toBeVisible()
    const weekRegion = page.getByRole('region', { name: 'Week' })
    const nonTodayButton = weekRegion.locator(
      'button:not(:has-text("Today"))',
    ).first()
    await expect(nonTodayButton).toBeVisible()
    await nonTodayButton.click()
    await expect(page).toHaveURL(/\?.*date=\d{4}-\d{2}-\d{2}/)
    await expect(page).toHaveURL(/\?.*view=week/)
    await expect(page.getByRole('tab', { name: 'Week', selected: true })).toBeVisible()
    await expect(nonTodayButton).toHaveAttribute('aria-pressed', 'true')
    const currentUrl = new URL(page.url())
    const selectedDate = currentUrl.searchParams.get('date')
    expect(selectedDate).toBeTruthy()

    const taskTitle = `Due on selected day ${Date.now()}`
    await page.getByRole('button', { name: 'Add task' }).click()
    const drawer = page.getByRole('dialog', { name: 'Add task' })
    await expect(drawer.getByLabel('Due date')).toBeVisible()
    const dueValue = await drawer.getByLabel('Due date').inputValue()
    expect(dueValue).toBe(selectedDate)
    await drawer.getByPlaceholder(/pay rent/i).fill(taskTitle)
    await waitForDueDate(drawer)
    await drawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(drawer).not.toBeVisible()
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 45000 })
  })

  test('selected week day carries into Day view until Today', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: 'Week' }).click()
    const weekRegion = page.getByRole('region', { name: 'Week' })
    const nonTodayButton = weekRegion.locator(
      'button:not(:has-text("Today"))',
    ).first()
    await expect(nonTodayButton).toBeVisible()
    await nonTodayButton.click()
    const urlAfterSelect = new URL(page.url())
    const selectedDate = urlAfterSelect.searchParams.get('date')
    expect(selectedDate).toBeTruthy()

    await page.getByRole('tab', { name: 'Day' }).click()
    await expect(page.getByRole('tab', { name: 'Day', selected: true })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`\\?[^#]*date=${selectedDate}`))
    await expect(page).toHaveURL(/\?.*view=day/)
    await expect(page.getByText(/Today - \w+/)).not.toBeVisible()
  })

  test('today reset button clears selection back to today', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: 'Week' }).click()
    const weekRegion = page.getByRole('region', { name: 'Week' })
    const nonTodayButton = weekRegion.locator(
      'button:not(:has-text("Today"))',
    ).first()
    await expect(nonTodayButton).toBeVisible()
    await nonTodayButton.click()
    await expect(page).toHaveURL(/\?.*date=\d{4}-\d{2}-\d{2}/)
    const resetButton = page.getByRole('button', { name: 'Jump to today' })
    await expect(resetButton).toBeVisible()
    await resetButton.click()
    await expect(resetButton).not.toBeVisible()
    await expect(page).toHaveURL(/\?.*view=week/)
    await expect(page).not.toHaveURL(/\bdate=/)

    await page.getByRole('tab', { name: 'Day' }).click()
    await expect(page.getByRole('tab', { name: 'Day', selected: true })).toBeVisible()
    await expect(page.getByText(/Today - \w+/)).toBeVisible()
    await expect(page).not.toHaveURL(/\bdate=/)
  })

  test('creation drawer task form has due date field defaulting to selected day', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Add task' }).click()
    const drawer = page.getByRole('dialog', { name: 'Add task' })
    const dueDateInput = drawer.getByLabel('Due date')
    await expect(dueDateInput).toBeVisible()
    await expect(dueDateInput).toHaveAttribute('type', 'date')
    const value = await dueDateInput.inputValue()
    const today = new Date()
    const expected =
      today.getUTCFullYear() +
      '-' +
      String(today.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getUTCDate()).padStart(2, '0')
    expect(value).toBe(expected)
  })
})
