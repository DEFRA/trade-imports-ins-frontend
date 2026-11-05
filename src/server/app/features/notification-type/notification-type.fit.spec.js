import { test, expect } from '@playwright/test'

import { expectNoSeriousOrCriticalViolations } from '../../../../../fit/axe.js'
import { signIn } from '../../../../../fit/sign-in.js'
import { dashboardPath, notificationTypePath } from '../../shared/paths.js'
import {
  expectOnlyNotificationTypeChecked,
  expectUnselectedNotificationType
} from './fit/notification-type.js'
import {
  SAMPLE_REFERENCE,
  expectedReturnUrl
} from './hand-overs.test-support.js'

const continueButton = (page) =>
  page.getByRole('button', { name: 'Continue', exact: true })

test.describe('notification type question', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto(notificationTypePath())
  })

  test('asks what you are importing with five unselected options and a single Continue button', async ({
    page
  }) => {
    await expectUnselectedNotificationType(page)
    await expect(page.locator('main').getByRole('button')).toHaveCount(1)
    await expect(continueButton(page)).toBeVisible()
  })

  test('goes back to the dashboard, with Dashboard highlighted in the service navigation', async ({
    page
  }) => {
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', dashboardPath())
    await expect(
      page.getByRole('link', { name: 'Dashboard', exact: true })
    ).toHaveAttribute('aria-current')
  })

  test('refuses Continue with nothing chosen and links the error to the first option', async ({
    page
  }) => {
    await continueButton(page).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(
      page
        .getByRole('alert')
        .getByRole('link', { name: 'Select what you are importing' })
    ).toHaveAttribute('href', '#notificationType')
    await expect(page).toHaveTitle(/^Error: /)
  })

  test('shows the alpha phase banner with an email feedback link', async ({
    page
  }) => {
    const banner = page
      .locator('.govuk-phase-banner')
      .filter({ hasText: 'Alpha' })

    await expect(banner).toContainText(
      'This is a new service. Help us improve it and give your feedback by email.'
    )
    await expect(banner.getByRole('link')).toHaveAttribute(
      'href',
      'mailto:APHAServiceDesk@apha.gov.uk'
    )
  })

  test("hands Plants for planting over to the plants service's start entry", async ({
    page
  }) => {
    const PLANTS_ORIGIN = 'http://localhost:3003'
    const handOver = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(notificationTypePath())
    )

    await page.getByRole('radio', { name: 'Plants for planting' }).check()
    await continueButton(page).click()

    const response = await handOver
    expect(response.status()).toBe(302)
    expect(await response.headerValue('location')).toBe(
      `${PLANTS_ORIGIN}/high-risk-plants/start`
    )
  })

  test.describe('opened for a live animals notification', () => {
    const ANIMALS_ORIGIN = 'http://localhost:3000'

    test.beforeEach(async ({ page }) => {
      await page.goto(
        `${notificationTypePath()}?notification-id=${SAMPLE_REFERENCE}&current-notification-type=live-animals`
      )
    })

    test('shows Live animals checked and no other option', async ({ page }) => {
      await expectOnlyNotificationTypeChecked(page, 'Live animals')
    })

    test("returns to the notification's origin page when Live animals stays chosen", async ({
      page
    }) => {
      const returned = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === notificationTypePath()
      )

      await continueButton(page).click()

      const response = await returned
      expect(response.status()).toBe(302)
      expect(await response.headerValue('location')).toBe(
        expectedReturnUrl({
          animalsBaseUrl: ANIMALS_ORIGIN,
          reference: SAMPLE_REFERENCE
        })
      )
    })
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'notification type')
  })

  test('has no serious or critical axe violations in its error state', async ({
    page
  }) => {
    await continueButton(page).click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'notification type error state'
    )
  })
})
