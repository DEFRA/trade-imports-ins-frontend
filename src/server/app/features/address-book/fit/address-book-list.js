import { expect } from '@playwright/test'

export const expectAddressBookList = async (page) => {
  await expect(page).toHaveURL(/\/address-book$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Address book' })
  ).toBeVisible()
  await expect(page.getByText('Page not found')).toHaveCount(0)
}
