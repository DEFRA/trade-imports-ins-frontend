import { test, expect } from '@playwright/test'

import { expectNoSeriousOrCriticalViolations } from '../../../../../fit/axe.js'
import { signIn } from '../../../../../fit/sign-in.js'
import {
  dashboardSearchField,
  expectDashboard,
  searchDashboardFor
} from './fit/dashboard.js'
import { expectUnselectedNotificationType } from '../notification-type/fit/notification-type.js'
import { dashboardPath, notificationTypePath } from '../../shared/paths.js'

const REFERENCE_NUMBER = 'GBN-AG-26-000001'
const referenceCells = (page) =>
  page.getByRole('cell', { name: /^GBN-AG-26-\d{6}$/ })
const createNewButton = (page) =>
  page.getByRole('button', { name: 'Create new', exact: true })

test.describe('dashboard', () => {
  test('shows the three visible notifications, in the default sort order, with enough to identify the consignment', async ({
    page
  }) => {
    await signIn(page)
    await page.goto(dashboardPath())

    await expectDashboard(page)
    await expect(referenceCells(page)).toHaveText([
      'GBN-AG-26-000002',
      REFERENCE_NUMBER,
      'GBN-AG-26-000003'
    ])
    await expect(page.getByRole('cell', { name: 'SUBMITTED' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'DRAFT' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'AMEND' })).toBeVisible()
  })

  test('offers Create new under the heading and above the search, and opens the question with nothing chosen', async ({
    page
  }) => {
    await signIn(page)
    await page.goto(dashboardPath())

    await expectDashboard(page)
    const button = createNewButton(page)
    await expect(button).toBeVisible()
    await expect(button).toHaveAttribute('href', notificationTypePath())
    const buttonBox = await button.boundingBox()
    const headingBox = await page
      .getByRole('heading', { level: 1, name: 'Dashboard' })
      .boundingBox()
    const searchBox = await dashboardSearchField(page).boundingBox()
    expect(headingBox.y).toBeLessThan(buttonBox.y)
    expect(buttonBox.y).toBeLessThan(searchBox.y)

    await button.click()

    await expectUnselectedNotificationType(page)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signIn(page)
    await page.goto(dashboardPath())

    await expectNoSeriousOrCriticalViolations(page, 'dashboard')
  })

  test('opening a submitted notification links into the read-only notification-view page', async ({
    page
  }) => {
    await signIn(page)
    await page.goto(dashboardPath())

    const link = page.getByRole('link', { name: /View.*GBN-AG-26-000001/s })
    await expect(link).toHaveAttribute(
      'href',
      'http://localhost:3000/live-animals/notifications/GBN-AG-26-000001/notification-view'
    )
  })

  test('opening a draft notification links back to the journey hub, not notification-view', async ({
    page
  }) => {
    await signIn(page)
    await page.goto(dashboardPath())

    const link = page.getByRole('link', { name: /View.*GBN-AG-26-000002/s })
    await expect(link).toHaveAttribute(
      'href',
      'http://localhost:3000/live-animals/notifications/GBN-AG-26-000002'
    )
  })

  test('searching by complete reference returns only the matching notification', async ({
    page
  }) => {
    await signIn(page)
    await page.goto(dashboardPath())

    await searchDashboardFor(page, REFERENCE_NUMBER)

    await expect(referenceCells(page)).toHaveText([REFERENCE_NUMBER])
  })

  test('no matching notification shows "No notifications found" and still offers Create new, opening the question with nothing chosen', async ({
    page
  }) => {
    await signIn(page)
    await page.goto(dashboardPath())

    await searchDashboardFor(page, 'GBN-AG-26-999999')

    await expect(page.getByText('No notifications found')).toBeVisible()
    await createNewButton(page).click()

    await expectUnselectedNotificationType(page)
  })
})
