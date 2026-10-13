import { expect, test } from '@playwright/test'

import { signIn } from '../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../shared/copy.en.js'
import { copy as addressBookCopy } from './address-book/copy/copy.en.js'
import { copy as dashboardCopy } from './dashboard/copy/copy.en.js'

const { serviceName, govukSuffix, errorTitlePrefix } = sharedCopy.layout

test.describe('page title', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('titles the home Dashboard, then the service name and GOV.UK, joined by hyphens', async ({
    page
  }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: dashboardCopy.title,
        exact: true
      })
    ).toBeVisible()
    await expect(page).toHaveTitle(
      'Dashboard - Import notification service - GOV.UK'
    )
  })

  test('titles the address book page the same way', async ({ page }) => {
    await page.goto('/address-book')

    await expect(
      page.getByRole('heading', { name: addressBookCopy.list.title })
    ).toBeVisible()
    await expect(page).toHaveTitle(
      `${addressBookCopy.list.title} - ${serviceName} - ${govukSuffix}`
    )
  })

  test('puts the error prefix in front of the whole title when the page shows errors', async ({
    page
  }) => {
    await page.goto('/address-book/add')

    await page.getByRole('button', { name: addressBookCopy.add.save }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveTitle(
      `${errorTitlePrefix}${addressBookCopy.add.title} - ${serviceName} - ${govukSuffix}`
    )
  })

  test('titles an error page the same way', async ({ page }) => {
    await page.goto('/no-such-page')

    await expect(page).toHaveTitle(
      `${sharedCopy.errorPage.notFound} - ${serviceName} - ${govukSuffix}`
    )
  })
})
