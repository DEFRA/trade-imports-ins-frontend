import { expect } from '@playwright/test'

const errorLink = (page, message) =>
  page.getByRole('alert').getByRole('link', { name: message, exact: true })

export async function expectErrorFocusOn(
  page,
  { message, label, expectedValue, url }
) {
  await expect(page).toHaveURL(url)
  const link = errorLink(page, message)
  await expect(link).toBeVisible()
  await link.click()
  const control = page.getByLabel(label)
  await expect(control).toBeFocused()
  await expect(control).toHaveValue(expectedValue)
}
