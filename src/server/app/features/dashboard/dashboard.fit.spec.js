import { test, expect } from '@playwright/test'

import { config } from '../../../../config/config.js'
import { expectNoSeriousOrCriticalViolations } from '../../../../../fit/axe.js'
import { signInAndOpen } from '../../../../../fit/sign-in.js'
import {
  dashboardSearchField,
  expectDashboard,
  searchDashboardFor
} from './fit/dashboard.js'
import { expectUnselectedNotificationType } from '../notification-type/fit/notification-type.js'
import { dashboardPath, notificationTypePath } from '../../shared/paths.js'

const REFERENCE_NUMBER = 'GBN-AG-26-000001'
const OTHER_REFERENCE_NUMBER = 'GBN-AG-26-000002'
const THIRD_REFERENCE_NUMBER = 'GBN-AG-26-000003'
const ANIMALS_BASE_URL = config.get('tradeImportsAnimalsFrontend.baseUrl')
const referenceCells = (page) =>
  page.getByRole('cell', { name: /^GBN-AG-26-\d{6}$/ })
const createNewButton = (page) =>
  page.getByRole('button', { name: 'Create new', exact: true })

test.describe('dashboard', () => {
  test('shows the three visible notifications, in the default sort order, with enough to identify the consignment', async ({
    page
  }) => {
    await signInAndOpen(page, 'stub-org-dashboard-list', dashboardPath())

    await expectDashboard(page)
    await expect(referenceCells(page)).toHaveText([
      OTHER_REFERENCE_NUMBER,
      REFERENCE_NUMBER,
      THIRD_REFERENCE_NUMBER
    ])
    await expect(page.getByRole('cell', { name: 'SUBMITTED' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'DRAFT' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'AMEND' })).toBeVisible()
  })

  test('offers Create new under the heading and above the search, and opens the question with nothing chosen', async ({
    page
  }) => {
    await signInAndOpen(page, 'stub-org-dashboard-create-new', dashboardPath())

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
    await signInAndOpen(page, 'stub-org-dashboard-axe', dashboardPath())

    await expectNoSeriousOrCriticalViolations(page, 'dashboard')
  })

  test('opening a submitted notification links into the read-only notification-view page', async ({
    page
  }) => {
    await signInAndOpen(
      page,
      'stub-org-dashboard-submitted-link',
      dashboardPath()
    )

    const link = page.getByRole('link', {
      name: new RegExp(`View.*${REFERENCE_NUMBER}`, 's')
    })
    await expect(link).toHaveAttribute(
      'href',
      `${ANIMALS_BASE_URL}/live-animals/notifications/${REFERENCE_NUMBER}/notification-view`
    )
  })

  test('opening a draft notification links back to the journey hub, not notification-view', async ({
    page
  }) => {
    await signInAndOpen(page, 'stub-org-dashboard-draft-link', dashboardPath())

    const link = page.getByRole('link', {
      name: new RegExp(`View.*${OTHER_REFERENCE_NUMBER}`, 's')
    })
    await expect(link).toHaveAttribute(
      'href',
      `${ANIMALS_BASE_URL}/live-animals/notifications/${OTHER_REFERENCE_NUMBER}`
    )
  })

  test('searching by complete reference returns only the matching notification', async ({
    page
  }) => {
    await signInAndOpen(page, 'stub-org-dashboard-search', dashboardPath())

    await searchDashboardFor(page, REFERENCE_NUMBER)

    await expect(referenceCells(page)).toHaveText([REFERENCE_NUMBER])
  })

  test('no matching notification shows "No notifications found" and still offers Create new, opening the question with nothing chosen', async ({
    page
  }) => {
    await signInAndOpen(page, 'stub-org-dashboard-no-match', dashboardPath())

    await searchDashboardFor(page, 'GBN-AG-26-999999')

    await expect(page.getByText('No notifications found')).toBeVisible()
    await createNewButton(page).click()

    await expectUnselectedNotificationType(page)
  })

  test('an organisation with no notifications sees the empty state and still offers Create new, opening the question with nothing chosen', async ({
    page
  }) => {
    await signInAndOpen(page, 'stub-org-dashboard-empty', dashboardPath())

    await expectDashboard(page)
    await expect(
      page.getByText('There are no notifications yet.')
    ).toBeVisible()
    await expect(referenceCells(page)).toHaveCount(0)
    await createNewButton(page).click()

    await expectUnselectedNotificationType(page)
  })
})
