import { expect, test } from '@playwright/test'

test.describe('Daily view smoke', () => {
  test('app loads and shows Daily view', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Tasks', level: 1 }),
    ).toBeVisible()
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
    await drawer.getByRole('button', { name: 'Add task' }).click()
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 45000 })

    const checkbox = page.getByLabel(`Mark ${taskTitle} complete`)
    await expect(checkbox).not.toBeChecked()
    await checkbox.click()
    // Non-recurring task: either checkbox becomes checked or task drops off Daily list (no longer due today)
    await Promise.race([
      expect(checkbox).toBeChecked({ timeout: 25000 }),
      expect(page.getByText(taskTitle)).not.toBeVisible({ timeout: 25000 }),
    ])
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
    await rootDrawer.getByRole('button', { name: 'Add task' }).click()
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
    await subTaskDrawer.getByRole('button', { name: 'Add task' }).click()
    await expect(page.getByRole('link', { name: taskOne })).toBeVisible()

    const taskCheckbox = page.getByLabel(`Mark ${taskOne} complete`)
    await taskCheckbox.check()
    await expect(taskCheckbox).toBeChecked()
    const completionIndicator = page.getByTestId('task-completion')
    await expect(completionIndicator.getByText('1/2 done')).toBeVisible({
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
    await rootDrawer.getByRole('button', { name: 'Add task' }).click()
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
    await subTaskDrawer.getByRole('button', { name: 'Add task' }).click()
    await page.getByRole('button', { name: 'Add sub-task' }).click()
    subTaskDrawer = page.getByRole('dialog', { name: 'Add sub-task' })
    await subTaskDrawer.getByPlaceholder(/pay rent/i).fill(taskB)
    await subTaskDrawer.getByRole('button', { name: 'Add task' }).click()
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
    await rootDrawer.getByRole('button', { name: 'Add task' }).click()
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

  test('selecting a day in week view shows that day and task creation uses it as due date', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.goto('/')
    await page.getByRole('tab', { name: 'Week' }).click()
    await expect(page.getByRole('region', { name: 'Week' })).toBeVisible()
    const weekRegion = page.getByRole('region', { name: 'Week' })
    const dayButtons = weekRegion.getByRole('button')
    await expect(dayButtons.first()).toBeVisible()
    const count = await dayButtons.count()
    expect(count).toBeGreaterThanOrEqual(2)
    const secondDay = dayButtons.nth(1)
    const ariaLabel = await secondDay.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
    await secondDay.click()
    await expect(page).toHaveURL(/\?.*date=\d{4}-\d{2}-\d{2}/)
    await expect(page).toHaveURL(/\?.*view=day/)
    await expect(page.getByRole('tab', { name: 'Day', selected: true })).toBeVisible()

    const taskTitle = `Due on selected day ${Date.now()}`
    await page.getByRole('button', { name: 'Add task' }).click()
    const drawer = page.getByRole('dialog', { name: 'Add task' })
    await expect(drawer.getByLabel('Due date')).toBeVisible()
    await drawer.getByPlaceholder(/pay rent/i).fill(taskTitle)
    await drawer.getByRole('button', { name: 'Add task' }).click()
    await expect(drawer).not.toBeVisible()
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 45000 })
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
