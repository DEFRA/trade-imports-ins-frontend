import { expect, test } from '@playwright/test'

import { signIn } from './sign-in.js'
import { expectNoSeriousOrCriticalViolations } from '../src/server/app/features/address-book/fit/axe.js'
import {
  fillValidAddress,
  validAddress
} from '../src/server/app/features/address-book/fit/address-form.js'
import { copy as sharedCopy } from '../src/server/app/shared/copy.en.js'
import { copy as dashboardCopy } from '../src/server/app/features/dashboard/copy/copy.en.js'
import { copy as addressBookCopy } from '../src/server/app/features/address-book/copy/copy.en.js'

test('a trader signs in, sees the dashboard, and adds, views and deletes an address', async ({
  page
}) => {
  await signIn(page, {
    organisationId: `stub-org-smoke-${crypto.randomUUID()}`
  })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: dashboardCopy.title })
  ).toBeVisible()

  await page
    .getByRole('link', {
      name: sharedCopy.layout.serviceNavigation.addressBook,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(/\/address-book$/)
  await expect(
    page.getByRole('heading', { level: 1, name: addressBookCopy.list.title })
  ).toBeVisible()

  await page.getByRole('button', { name: addressBookCopy.list.add }).click()
  await expect(page).toHaveURL(/\/address-book\/add$/)
  await fillValidAddress(page)
  await page.getByRole('button', { name: addressBookCopy.add.save }).click()
  await expect(page).toHaveURL(/\/address-book$/)
  await expect(
    page.getByText(addressBookCopy.successBanner.added(validAddress.name))
  ).toBeVisible()

  await page
    .getByRole('link', {
      name: `${addressBookCopy.list.table.view} ${validAddress.name}`
    })
    .click()
  await expect(
    page.getByRole('heading', { level: 1, name: validAddress.name })
  ).toBeVisible()

  await page.getByRole('button', { name: addressBookCopy.view.delete }).click()
  await expect(page).toHaveURL(/\/address-book\/[^/]+\/delete$/)
  await page
    .getByRole('button', { name: addressBookCopy.delete.confirm })
    .click()
  await expect(page).toHaveURL(/\/address-book$/)
  await expect(
    page.getByText(addressBookCopy.successBanner.deleted(validAddress.name))
  ).toBeVisible()
  await expect(
    page.getByRole('link', {
      name: `${addressBookCopy.list.table.view} ${validAddress.name}`
    })
  ).toHaveCount(0)

  await expectNoSeriousOrCriticalViolations(
    page,
    'address book after the smoke run'
  )
})
