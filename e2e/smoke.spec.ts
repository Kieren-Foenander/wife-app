import { test, expect } from '@playwright/test'

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
})
