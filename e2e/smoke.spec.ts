import { expect, test } from '@playwright/test'

test.describe('Daily view smoke', () => {
  test('app loads and shows Daily view', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Categories', level: 1 })).toBeVisible()
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

  test('category link opens detail route', async ({ page }) => {
    const categoryName = `Chores ${Date.now()}`
    const childCategoryName = `Laundry ${Date.now()}`
    const childTaskTitle = `Vacuum ${Date.now()}`
    await page.goto('/')
    await page.getByPlaceholder(/laundry, groceries/i).fill(categoryName)
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('link', { name: categoryName })).toBeVisible()
    await page.getByRole('link', { name: categoryName }).click()
    await expect(page.getByRole('heading', { name: categoryName })).toBeVisible()
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
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('link', { name: rootCategoryName })).toBeVisible()
    await page.getByRole('link', { name: rootCategoryName }).click()
    await expect(
      page.getByRole('heading', { name: rootCategoryName }),
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
    await page.getByRole('link', { name: childCategoryName }).click()
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
    await expect(
      page.getByRole('link', { name: grandchildCategoryName }),
    ).toBeVisible()
    await page.getByRole('link', { name: grandchildCategoryName }).click()
    await expect(
      page.getByRole('heading', { name: grandchildCategoryName }),
    ).toBeVisible()

    const breadcrumb = page.locator('nav', { hasText: 'Daily' })
    await expect(breadcrumb).toContainText(rootCategoryName)
    await expect(breadcrumb).toContainText(childCategoryName)
  })
})
