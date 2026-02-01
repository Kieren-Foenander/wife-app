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
    await page.goto('/')
    await page.getByPlaceholder(/laundry, groceries/i).fill(categoryName)
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('link', { name: categoryName })).toBeVisible()
    await page.getByRole('link', { name: categoryName }).click()
    await expect(page.getByRole('heading', { name: categoryName })).toBeVisible()
    await expect(page.getByText('Category')).toBeVisible()
  })
})
