import { test, expect } from '@playwright/test'

import { config } from '../../../../config/config.js'
import { expectNoSeriousOrCriticalViolations } from '../../../../../fit/axe.js'
import { signInAndOpen } from '../../../../../fit/sign-in.js'
import { dashboardPath, notificationTypePath } from '../../shared/paths.js'
import {
  expectOnlyNotificationTypeChecked,
  expectUnselectedNotificationType
} from './fit/notification-type.js'
import {
  SAMPLE_REFERENCE,
  expectedReturnUrl
} from './hand-overs.test-support.js'

const ANIMALS_BASE_URL = config.get('tradeImportsAnimalsFrontend.baseUrl')
const PLANTS_BASE_URL = config.get('tradeImportsPlantsFrontend.baseUrl')

const continueButton = (page) =>
  page.getByRole('button', { name: 'Continue', exact: true })

test.describe('notification type question', () => {
  test('asks what you are importing with five unselected options and a single Continue button', async ({
    page
  }) => {
    await signInAndOpen(
      page,
      'stub-org-notification-type-options',
      notificationTypePath()
    )

    await expectUnselectedNotificationType(page)
    await expect(page.locator('main').getByRole('button')).toHaveCount(1)
    await expect(continueButton(page)).toBeVisible()
  })

  test('goes back to the dashboard, with Dashboard highlighted in the service navigation', async ({
    page
  }) => {
    await signInAndOpen(
      page,
      'stub-org-notification-type-back',
      notificationTypePath()
    )

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
    await signInAndOpen(
      page,
      'stub-org-notification-type-refused',
      notificationTypePath()
    )

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
    await signInAndOpen(
      page,
      'stub-org-notification-type-banner',
      notificationTypePath()
    )
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
    await signInAndOpen(
      page,
      'stub-org-notification-type-plants-hand-over',
      notificationTypePath()
    )
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
      `${PLANTS_BASE_URL}/high-risk-plants/start`
    )
  })

  test.describe('opened for a live animals notification', () => {
    const livePath = `${notificationTypePath()}?notification-id=${SAMPLE_REFERENCE}&current-notification-type=live-animals`

    test('shows Live animals checked and no other option', async ({ page }) => {
      await signInAndOpen(
        page,
        'stub-org-notification-type-live-checked',
        livePath
      )

      await expectOnlyNotificationTypeChecked(page, 'Live animals')
    })

    test("returns to the notification's origin page when Live animals stays chosen", async ({
      page
    }) => {
      await signInAndOpen(
        page,
        'stub-org-notification-type-live-return',
        livePath
      )
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
          animalsBaseUrl: ANIMALS_BASE_URL,
          reference: SAMPLE_REFERENCE
        })
      )
    })
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signInAndOpen(
      page,
      'stub-org-notification-type-axe',
      notificationTypePath()
    )

    await expectNoSeriousOrCriticalViolations(page, 'notification type')
  })

  test('has no serious or critical axe violations in its error state', async ({
    page
  }) => {
    await signInAndOpen(
      page,
      'stub-org-notification-type-axe-error',
      notificationTypePath()
    )
    await continueButton(page).click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'notification type error state'
    )
  })
})
