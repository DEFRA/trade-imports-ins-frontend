import { test, expect } from '@playwright/test'

import {
  expectNoSeriousOrCriticalAxeViolations,
  signIn
} from '../../../address-book/fit/address-form.js'

test.describe('dashboard', () => {
  test('shows notifications from every status with enough to identify the consignment (AC1, AC2)', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true })
    ).toBeVisible()

    // Stub dataset spans SUBMITTED, DRAFT and AMEND — all three must appear
    // in the same list (AC2), each with enough to identify the consignment.
    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000001', exact: true })
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

    // The soft-deleted stub notification must never appear.
    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000004', exact: true })
    ).toHaveCount(0)

    await expectNoSeriousOrCriticalAxeViolations(page, 'dashboard')
  })

  test('opening a submitted notification links into the read-only notification-view page (AC3)', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    const link = page.getByRole('link', { name: /View.*GBN-AG-26-000001/s })
    await expect(link).toHaveAttribute(
      'href',
      'http://localhost:3000/notifications/GBN-AG-26-000001/notification-view'
    )
  })

  test('opening a draft notification links back to the journey hub, not notification-view (AC3)', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    const link = page.getByRole('link', { name: /View.*GBN-AG-26-000002/s })
    await expect(link).toHaveAttribute(
      'href',
      'http://localhost:3000/notifications/GBN-AG-26-000002'
    )
  })

  test('searching by complete reference returns only the matching notification (AC4)', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    await page
      .getByLabel('Search by notification reference')
      .fill('GBN-AG-26-000001')
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000001', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000002', exact: true })
    ).toHaveCount(0)
  })

  test('no matching notification shows "No notifications found" (AC5)', async ({
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
