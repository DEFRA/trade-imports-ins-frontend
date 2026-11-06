import { expect } from '@playwright/test'

import { dashboardPath } from '../../../shared/paths.js'

export const expectDashboard = async (page) => {
  await expect(page).toHaveURL(dashboardPath())
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' })
  ).toBeVisible()
}

export const dashboardSearchField = (page) =>
  page.getByLabel('Search by notification reference')

export const searchDashboardFor = async (page, referenceNumber) => {
  await dashboardSearchField(page).fill(referenceNumber)
  await page.getByRole('button', { name: 'Search' }).click()
}
