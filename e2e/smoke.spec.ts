import { expect, test } from '@playwright/test'

test.describe('Daily view smoke', () => {
  test('app loads and shows Daily view', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Categories', level: 1 })).toBeVisible()
    await expect(page.getByText('Daily')).toBeVisible()
  })

  test('view mode toggle switches Day/Week/Month', async ({ page }) => {
    await page.goto('/')
    const tablist = page.getByRole('tablist', { name: 'View mode' })
    await expect(tablist).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Day', selected: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Week', selected: false })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Month', selected: false })).toBeVisible()
    await expect(page.getByText('Daily')).toBeVisible()
    await page.getByRole('tab', { name: 'Week' }).click()
    await expect(page.getByRole('tab', { name: 'Week', selected: true })).toBeVisible()
    await expect(page.getByText('Weekly')).toBeVisible()
    await page.getByRole('tab', { name: 'Month' }).click()
    await expect(page.getByRole('tab', { name: 'Month', selected: true })).toBeVisible()
    await expect(page.getByText('Monthly')).toBeVisible()
    await page.getByRole('tab', { name: 'Day' }).click()
    await expect(page.getByRole('tab', { name: 'Day', selected: true })).toBeVisible()
    await expect(page.getByText('Daily')).toBeVisible()
  })

  test('category and task forms are present', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByPlaceholder(/laundry, groceries/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
    await expect(page.getByPlaceholder(/pay rent/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add task' })).toBeVisible()
  })

  test('sections for categories and tasks exist', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /your categories/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /your tasks/i })).toBeVisible()
  })

  test('task completion toggle works', async ({ page }) => {
    test.setTimeout(60_000)
    const taskTitle = `Pay bills ${Date.now()}`
    await page.goto('/')
    await page.getByPlaceholder(/pay rent/i).fill(taskTitle)
    await page.getByRole('button', { name: 'Add task' }).click()
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

  test('category shows partial completion indicator', async ({ page }) => {
    test.setTimeout(90_000)
    const categoryName = `Projects ${Date.now()}`
    const taskOne = `Draft plan ${Date.now()}`
    const taskTwo = `Review notes ${Date.now()}`

    await page.goto('/')
    await page.getByPlaceholder(/laundry, groceries/i).fill(categoryName)
    await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled()
    await page.getByRole('button', { name: 'Create' }).click()
    const categoryLink = page.getByRole('link', { name: categoryName })
    await expect(categoryLink).toBeVisible({ timeout: 45000 })
    await categoryLink.click()
    await page.waitForURL(/\/categories\//)
    await expect(
      page.getByRole('heading', { name: categoryName }),
    ).toBeVisible({ timeout: 45000 })

    const childTaskForm = page
      .getByRole('heading', { name: /add a child task/i })
      .locator('..')
    await childTaskForm.getByPlaceholder(/vacuum, wipe counters/i).fill(taskOne)
    await childTaskForm.getByRole('button', { name: 'Add task' }).click()
    await childTaskForm.getByPlaceholder(/vacuum, wipe counters/i).fill(taskTwo)
    await childTaskForm.getByRole('button', { name: 'Add task' }).click()
    await expect(page.getByText(taskOne)).toBeVisible()
    await expect(page.getByText(taskTwo)).toBeVisible()

    await page.getByRole('link', { name: 'Back to Daily' }).click()

    const categoryRow = page.locator('li', {
      has: page.getByRole('link', { name: categoryName }),
    })
    await expect(categoryRow.getByText('0/2 done')).toBeVisible()
    await expect(categoryRow.getByText('Partial')).toBeVisible()

    await page.getByRole('link', { name: categoryName }).click()
    const taskOneCheckbox = page.getByLabel(`Mark ${taskOne} complete`)
    const taskTwoCheckbox = page.getByLabel(`Mark ${taskTwo} complete`)
    await expect(taskOneCheckbox).toBeVisible()
    await expect(taskTwoCheckbox).toBeVisible()
    await taskOneCheckbox.check()
    await expect(taskOneCheckbox).toBeChecked()
    await taskTwoCheckbox.check()
    await expect(taskTwoCheckbox).toBeChecked()
    const completionIndicator = page.getByTestId('category-completion')
    await expect(completionIndicator.getByText('2/2 done')).toBeVisible({
      timeout: 45000,
    })
    await expect(completionIndicator.getByText('Completed')).toBeVisible({
      timeout: 45000,
    })
    await page.getByRole('link', { name: 'Back to Daily' }).click()
  })

  test('bulk complete marks descendant tasks complete', async ({ page }) => {
    const categoryName = `Bulk ${Date.now()}`
    const taskA = `Task A ${Date.now()}`
    const taskB = `Task B ${Date.now()}`

    await page.goto('/')
    await page.getByPlaceholder(/laundry, groceries/i).fill(categoryName)
    await page.getByRole('button', { name: 'Create' }).click()
    const categoryLink = page.getByRole('link', { name: categoryName })
    await expect(categoryLink).toBeVisible({ timeout: 45000 })
    await categoryLink.click()
    await page.waitForURL(/\/categories\//)
    await expect(
      page.getByRole('heading', { name: categoryName }),
    ).toBeVisible({ timeout: 45000 })

    const childTaskForm = page
      .getByRole('heading', { name: /add a child task/i })
      .locator('..')
    await childTaskForm
      .getByPlaceholder(/vacuum, wipe counters/i)
      .fill(taskA)
    await childTaskForm.getByRole('button', { name: 'Add task' }).click()
    await childTaskForm
      .getByPlaceholder(/vacuum, wipe counters/i)
      .fill(taskB)
    await childTaskForm.getByRole('button', { name: 'Add task' }).click()
    await expect(page.getByText(taskA)).toBeVisible()
    await expect(page.getByText(taskB)).toBeVisible()

    const bulkCompleteButton = page.getByRole('button', {
      name: 'Complete all tasks',
    })
    await expect(bulkCompleteButton).toBeVisible({ timeout: 45000 })
    await expect(bulkCompleteButton).toBeEnabled()
    await bulkCompleteButton.click()
    await expect(page.getByLabel(`Mark ${taskA} complete`)).toBeChecked()
    await expect(page.getByLabel(`Mark ${taskB} complete`)).toBeChecked({
      timeout: 10000,
    })
  })

  test('category link opens detail route', async ({ page }) => {
    const categoryName = `Chores ${Date.now()}`
    const childCategoryName = `Laundry ${Date.now()}`
    const childTaskTitle = `Vacuum ${Date.now()}`
    await page.goto('/')
    await page.getByPlaceholder(/laundry, groceries/i).fill(categoryName)
    await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled()
    await page.getByRole('button', { name: 'Create' }).click()
    const categoryNavLink = page.getByRole('link', { name: categoryName })
    await expect(categoryNavLink).toBeVisible({ timeout: 45000 })
    await categoryNavLink.click()
    await page.waitForURL(/\/categories\//)
    await expect(
      page.getByRole('heading', { name: categoryName }),
    ).toBeVisible({ timeout: 45000 })
    await expect(page.getByText('Category', { exact: true })).toBeVisible()
    const breadcrumb = page.locator('nav', { hasText: 'Daily' })
    await expect(breadcrumb.getByRole('link', { name: 'Daily' })).toBeVisible()
    await expect(breadcrumb).toContainText(categoryName)
    await expect(
      page.getByRole('heading', { name: /child categories/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /child tasks/i }),
    ).toBeVisible()

    const childCategoryForm = page
      .getByRole('heading', { name: /add a child category/i })
      .locator('..')
    await childCategoryForm
      .getByPlaceholder(/cleaning, errands/i)
      .fill(childCategoryName)
    await childCategoryForm.getByRole('button', { name: 'Create' }).click()
    await expect(
      page.getByRole('link', { name: childCategoryName }),
    ).toBeVisible()

    const childTaskForm = page
      .getByRole('heading', { name: /add a child task/i })
      .locator('..')
    await childTaskForm
      .getByPlaceholder(/vacuum, wipe counters/i)
      .fill(childTaskTitle)
    await childTaskForm.getByRole('button', { name: 'Add task' }).click()
    await expect(page.getByText(childTaskTitle)).toBeVisible()
  })

  test('deep nesting navigation works', async ({ page }) => {
    const rootCategoryName = `Home ${Date.now()}`
    const childCategoryName = `Kitchen ${Date.now()}`
    const grandchildCategoryName = `Pantry ${Date.now()}`

    await page.goto('/')
    await page.getByPlaceholder(/laundry, groceries/i).fill(rootCategoryName)
    await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled()
    await page.getByRole('button', { name: 'Create' }).click()
    const rootCategoryNavLink = page.getByRole('link', {
      name: rootCategoryName,
    })
    await expect(rootCategoryNavLink).toBeVisible({ timeout: 45000 })
    await rootCategoryNavLink.click()
    await page.waitForURL(/\/categories\//)
    await expect(
      page.getByRole('heading', { name: rootCategoryName }),
    ).toBeVisible({ timeout: 45000 })

    const childCategoryForm = page
      .getByRole('heading', { name: /add a child category/i })
      .locator('..')
    await childCategoryForm
      .getByPlaceholder(/cleaning, errands/i)
      .fill(childCategoryName)
    await childCategoryForm.getByRole('button', { name: 'Create' }).click()
    const childCategoryNavLink = page.getByRole('link', {
      name: childCategoryName,
    })
    await expect(childCategoryNavLink).toBeVisible()
    await childCategoryNavLink.click()
    await page.waitForURL(/\/categories\//)
    await expect(
      page.getByRole('heading', { name: childCategoryName }),
    ).toBeVisible()

    const grandchildCategoryForm = page
      .getByRole('heading', { name: /add a child category/i })
      .locator('..')
    await grandchildCategoryForm
      .getByPlaceholder(/cleaning, errands/i)
      .fill(grandchildCategoryName)
    await grandchildCategoryForm.getByRole('button', { name: 'Create' }).click()
    const grandchildCategoryNavLink = page.getByRole('link', {
      name: grandchildCategoryName,
    })
    await expect(grandchildCategoryNavLink).toBeVisible()
    await grandchildCategoryNavLink.click()
    await page.waitForURL(/\/categories\//)
    await expect(
      page.getByRole('heading', { name: grandchildCategoryName }),
    ).toBeVisible()

    const breadcrumb = page.locator('nav', { hasText: 'Daily' })
    await expect(breadcrumb).toContainText(rootCategoryName)
    await expect(breadcrumb).toContainText(childCategoryName)
  })
})
