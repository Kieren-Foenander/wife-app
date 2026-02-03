import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

async function waitForDueDate(drawer: Locator) {
  await expect(drawer.getByLabel('Due date')).toHaveValue(/\d{4}-\d{2}-\d{2}/)
}

test.describe('Daily view smoke', () => {
  test('app loads and shows Daily view', async ({ page }) => {
    await page.goto('/')
    const main = page.getByRole('main', { name: 'Daily view' })
    await expect(main).toBeVisible()
    await expect(page.getByText('Wife App')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Tasks', level: 1 }),
    ).toBeVisible()
    await expect(page.getByText(/Today - \w+/)).toBeVisible()
    const primaryNav = page.getByRole('navigation', { name: 'Primary' })
    await expect(
      primaryNav.getByRole('link', { name: 'Tasks' }),
    ).toHaveAttribute('aria-current', 'page')
  })

  test('range mode toggle switches between week and month views', async ({
    page,
  }) => {
    await page.goto('/')

    const weekRegion = page.getByRole('region', { name: 'Week' })
    await expect(weekRegion).toBeVisible()

    await page.getByRole('button', { name: /month/i }).click()
    await expect(page.getByRole('region', { name: 'Month' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Week' })).toHaveCount(0)

    await page.getByRole('button', { name: /week/i }).click()
    await expect(page.getByRole('region', { name: 'Week' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Month' })).toHaveCount(0)
  })

  test('task creation drawer shows task form and defaults', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Add task' }).click()
    const drawer = page.getByRole('dialog', { name: 'Add task' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByLabel('Task title')).toBeVisible()
    await expect(drawer.getByPlaceholder(/pay rent/i)).toBeVisible()
    await expect(drawer.getByLabel('Parent task')).toHaveCount(0)

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

    const repeatCheckbox = drawer.getByRole('checkbox', { name: 'Repeat task' })
    await expect(repeatCheckbox).toBeVisible()
    await expect(
      drawer.getByRole('combobox', { name: 'Repeat frequency' }),
    ).toHaveCount(0)
    await repeatCheckbox.click()
    await expect(
      drawer.getByRole('combobox', { name: 'Repeat frequency' }),
    ).toBeVisible()
  })

  test('root task creation and completion toggle works', async ({ page }) => {
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

  test('task link opens detail route with breadcrumb and sub-tasks', async ({
    page,
  }) => {
    test.setTimeout(60_000)
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
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(breadcrumb.getByRole('link', { name: 'Daily' })).toBeVisible()
    await expect(breadcrumb).toContainText(rootTaskName)
    await expect(
      page.getByRole('heading', { name: /sub-tasks/i }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Add sub-task' }).click()
    const subDrawer = page.getByRole('dialog', { name: 'Add sub-task' })
    await expect(subDrawer.getByLabel('Parent task')).toBeVisible()
    await subDrawer.getByPlaceholder(/pay rent/i).fill(childTaskTitle)
    await waitForDueDate(subDrawer)
    await subDrawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(page.getByRole('link', { name: childTaskTitle })).toBeVisible({
      timeout: 45000,
    })
  })

  test('task detail shows completion indicator when sub-tasks complete', async ({
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
    await subTaskDrawer.getByPlaceholder(/pay rent/i).fill(taskOne)
    await waitForDueDate(subTaskDrawer)
    await subTaskDrawer
      .locator('form')
      .evaluate((form: HTMLFormElement) => form.requestSubmit())
    await expect(page.getByRole('link', { name: taskOne })).toBeVisible({
      timeout: 45000,
    })

    const taskCheckbox = page.getByLabel(`Mark ${taskOne} complete`)
    await taskCheckbox.check()
    await expect(taskCheckbox).toBeChecked({ timeout: 15000 })
    const completionIndicator = page.getByTestId('task-completion')
    await expect(completionIndicator.getByText('2/2 done')).toBeVisible({
      timeout: 45000,
    })
    await expect(completionIndicator.getByText('Completed')).toBeVisible({
      timeout: 45000,
    })
  })

  test('parent completion checkbox completes all sub-tasks', async ({
    page,
  }) => {
    test.setTimeout(90_000)
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
    await expect(page.getByRole('link', { name: taskA })).toBeVisible({
      timeout: 45000,
    })
    await expect(page.getByRole('link', { name: taskB })).toBeVisible({
      timeout: 45000,
    })

    const parentCheckbox = page.getByRole('checkbox', {
      name: 'Mark this task and all sub-tasks complete',
    })
    await expect(parentCheckbox).toBeVisible({ timeout: 45000 })
    await expect(parentCheckbox).toBeEnabled()
    await parentCheckbox.click()
    await expect(page.getByLabel(`Mark ${taskA} complete`)).toBeChecked({
      timeout: 15000,
    })
    await expect(page.getByLabel(`Mark ${taskB} complete`)).toBeChecked({
      timeout: 15000,
    })
  })

  test('selecting a day in week strip updates URL and due date in drawer', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.goto('/')
    const weekRegion = page.getByRole('region', { name: 'Week' })
    await expect(weekRegion).toBeVisible()
    const nonTodayButton = weekRegion
      .getByRole('button')
      .filter({ hasNotText: 'Today' })
      .first()
    await expect(nonTodayButton).toBeVisible()
    await nonTodayButton.click()
    await expect(page).toHaveURL(/\?.*date=\d{4}-\d{2}-\d{2}/)
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

  test('Jump to Today clears date selection', async ({ page }) => {
    await page.goto('/')
    const weekRegion = page.getByRole('region', { name: 'Week' })
    const nonTodayButton = weekRegion
      .getByRole('button')
      .filter({ hasNotText: 'Today' })
      .first()
    await expect(nonTodayButton).toBeVisible()
    await nonTodayButton.click()
    await expect(page).toHaveURL(/\?.*date=\d{4}-\d{2}-\d{2}/)
    const resetButton = page.getByRole('button', { name: 'Jump to Today' })
    await expect(resetButton).toBeVisible()
    await resetButton.click()
    await expect(resetButton).not.toBeVisible()
    await expect(page).not.toHaveURL(/\bdate=/)
    await expect(page.getByText(/Today - \w+/)).toBeVisible()
  })
})
