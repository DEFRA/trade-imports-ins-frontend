import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

import { signIn } from '../../../../../fit/sign-in.js'

const PAGE_URL = '/notification-type'
const HEADING = /What are you importing\?/
const PLANTS_ORIGIN = 'http://localhost:3003'
const LIVE_ANIMALS_LABEL = 'Live animals'
const LABELS_IN_ORDER = [
  LIVE_ANIMALS_LABEL,
  'Germinal products (semen, ova, embryos)',
  'Plants for planting',
  'Potatoes (seed and ware)',
  'Wood products'
]

const expectNoSeriousOrCriticalViolations = async (page, subject) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `${subject} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('notification type question', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto(PAGE_URL)
  })

  test('asks what you are importing with five unselected options and a single Continue button', async ({
    page
  }) => {
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
    await expect(
      page.getByRole('button', { name: 'Continue', exact: true })
    ).toBeVisible()
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
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

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
    const banner = page.locator('.govuk-phase-banner', { hasText: 'Alpha' })

    await expect(banner).toContainText('Alpha')
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
    // The browser follows the redirect into whatever answers on the plants
    // origin, which a fit run cannot rely on, so read the hand-over from the
    // redirect response itself.
    const handOver = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(PAGE_URL)
    )

    await page.getByRole('radio', { name: 'Plants for planting' }).check()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

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
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'notification type error state'
    )
  })
})

const TEMPLATE_PAGE_URL = '/notification-type/template'
const ANIMALS_ORIGIN = 'http://localhost:3000'
const MANAGE_TEMPLATES_URL = `${ANIMALS_ORIGIN}/live-animals/templates`
const TEMPLATE_LABELS = [
  LIVE_ANIMALS_LABEL,
  'Germinal products (semen, ova, embryos)'
]

test.describe('notification type question in template mode', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto(TEMPLATE_PAGE_URL)
  })

  test('offers only live animals and germinal products, unselected, with a single Continue button', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: HEADING })
    ).toBeVisible()
    await expect(page.getByText('About the consignment')).toBeVisible()

    const radios = page.getByRole('radio')
    await expect(radios).toHaveCount(TEMPLATE_LABELS.length)
    for (const [index, label] of TEMPLATE_LABELS.entries()) {
      await expect(radios.nth(index)).toHaveAccessibleName(label)
      await expect(radios.nth(index)).not.toBeChecked()
    }
    await expect(page.locator('main').getByRole('button')).toHaveCount(1)
    await expect(page.locator('.app-journey-strip')).toHaveCount(0)
  })

  test('goes back to Manage templates, with Templates highlighted in the service navigation', async ({
    page
  }) => {
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', MANAGE_TEMPLATES_URL)
    await expect(
      page.getByRole('link', { name: 'Templates', exact: true })
    ).toHaveAttribute('aria-current')
  })

  test('refuses Continue with nothing chosen for a template and links the error to the first option', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    await expect(
      page
        .getByRole('alert')
        .getByRole('link', { name: 'Select what you are importing' })
    ).toHaveAttribute('href', '#notificationType')
    await expect(page).toHaveTitle(/^Error: /)
  })

  test('hands Live animals over to the template name page', async ({
    page
  }) => {
    // The browser follows the redirect into whatever answers on the animals
    // origin, which a fit run cannot rely on, so read the hand-over from the
    // redirect response itself.
    const handOver = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(TEMPLATE_PAGE_URL)
    )

    await page.getByRole('radio', { name: LIVE_ANIMALS_LABEL }).check()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    const response = await handOver
    expect(response.status()).toBe(302)
    expect(await response.headerValue('location')).toBe(
      `${MANAGE_TEMPLATES_URL}/new?type=live-animals`
    )
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'template type question')
  })

  test('has no serious or critical axe violations in its error state', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'template type question error state'
    )
  })
})
