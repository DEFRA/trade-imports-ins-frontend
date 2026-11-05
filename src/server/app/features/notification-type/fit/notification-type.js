import { expect } from '@playwright/test'

import { notificationTypePath } from '../../../shared/paths.js'

export const expectUnselectedNotificationType = async (page) => {
  await expect(page).toHaveURL(notificationTypePath())
  await expect(
    page.getByRole('heading', { level: 1, name: /What are you importing\?/ })
  ).toBeVisible()

  const LABELS_IN_ORDER = [
    'Live animals',
    'Germinal products (semen, ova, embryos)',
    'Plants for planting',
    'Potatoes (seed and ware)',
    'Wood products'
  ]
  const radios = page.getByRole('radio')
  await expect(radios).toHaveCount(LABELS_IN_ORDER.length)
  for (const [index, label] of LABELS_IN_ORDER.entries()) {
    await expect(radios.nth(index)).toHaveAccessibleName(label)
    await expect(radios.nth(index)).not.toBeChecked()
  }
}

export const expectOnlyNotificationTypeChecked = async (page, label) => {
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1)
  await expect(page.getByRole('radio', { name: label })).toBeChecked()
}
