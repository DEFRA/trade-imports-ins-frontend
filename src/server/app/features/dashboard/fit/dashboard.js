export const dashboardSearchField = (page) =>
  page.getByLabel('Search by notification reference')

export const searchDashboardFor = async (page, referenceNumber) => {
  await dashboardSearchField(page).fill(referenceNumber)
  await page.getByRole('button', { name: 'Search' }).click()
}
