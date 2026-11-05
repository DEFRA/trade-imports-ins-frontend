import { test, expect } from '@playwright/test'

import { expectNoSeriousOrCriticalViolations } from '../../../../../fit/axe.js'
import { signIn } from '../../../../../fit/sign-in.js'

const REFERENCE_NUMBER = 'GBN-AG-26-000001'

test.describe('dashboard', () => {
  test('shows notifications from every status with enough to identify the consignment', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true })
    ).toBeVisible()

    await expect(
      page.getByRole('cell', { name: REFERENCE_NUMBER, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000002', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000003', exact: true })
    ).toBeVisible()
    await expect(page.getByRole('cell', { name: 'SUBMITTED' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'DRAFT' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'AMEND' })).toBeVisible()

    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000004', exact: true })
    ).toHaveCount(0)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signIn(page)
    await page.goto('/')

    await expectNoSeriousOrCriticalViolations(page, 'dashboard')
  })

  test('opening a submitted notification links into the read-only notification-view page', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

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
    await page.goto('/')

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
    await page.goto('/')

    await page
      .getByLabel('Search by notification reference')
      .fill(REFERENCE_NUMBER)
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(
      page.getByRole('cell', { name: REFERENCE_NUMBER, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000002', exact: true })
    ).toHaveCount(0)
  })

  test('no matching notification shows "No notifications found"', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    await page
      .getByLabel('Search by notification reference')
      .fill('GBN-AG-26-999999')
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page.getByText('No notifications found')).toBeVisible()
  })
})
