import { expect } from '@playwright/test'

export const expectDashboard = async (page) => {
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' })
  ).toBeVisible()
}
