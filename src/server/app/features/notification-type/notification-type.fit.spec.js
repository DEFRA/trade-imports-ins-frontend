import { test, expect } from '@playwright/test'

import { expectNoSeriousOrCriticalViolations } from '../../../../../fit/axe.js'
import { signIn } from '../../../../../fit/sign-in.js'

const PAGE_URL = '/notification-type'

const continueButton = (page) =>
  page.getByRole('button', { name: 'Continue', exact: true })

test.describe('notification type question', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto(PAGE_URL)
  })

  test('asks what you are importing with five unselected options and a single Continue button', async ({
    page
  }) => {
    const HEADING = /What are you importing\?/
    const LABELS_IN_ORDER = [
      'Live animals',
      'Germinal products (semen, ova, embryos)',
      'Plants for planting',
      'Potatoes (seed and ware)',
      'Wood products'
    ]
    await expect(
      page.getByRole('heading', { level: 1, name: HEADING })
    ).toBeVisible()

    const radios = page.getByRole('radio')
    await expect(radios).toHaveCount(LABELS_IN_ORDER.length)
    for (const [index, label] of LABELS_IN_ORDER.entries()) {
      await expect(radios.nth(index)).toHaveAccessibleName(label)
      await expect(radios.nth(index)).not.toBeChecked()
    }
    await expect(page.locator('main').getByRole('button')).toHaveCount(1)
    await expect(continueButton(page)).toBeVisible()
  })

  test('goes back to the dashboard, with Dashboard highlighted in the service navigation', async ({
    page
  }) => {
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', '/')
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
        response.url().endsWith(PAGE_URL)
    )

    await page.getByRole('radio', { name: 'Plants for planting' }).check()
    await continueButton(page).click()

    const response = await handOver
    expect(response.status()).toBe(302)
    expect(await response.headerValue('location')).toBe(
      `${PLANTS_ORIGIN}/high-risk-plants/start`
    )
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
