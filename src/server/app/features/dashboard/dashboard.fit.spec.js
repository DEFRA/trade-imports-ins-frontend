import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

import { signIn } from '../../../../../fit/sign-in.js'

const REFERENCE_NUMBER = 'GBN-AG-26-000001'
const CREATE_NEW = 'Create new'
const USE_TEMPLATE = 'Use template'
const UNMATCHED_REFERENCE = 'GBN-AG-26-999999'
const UNAVAILABLE_REFERENCE = 'GBN-AG-26-500000'
const NO_RESULTS = 'No notifications found'
const MANAGE_TEMPLATES_HREF = 'http://localhost:3000/live-animals/templates'
const SEARCH_LABEL = 'Search by notification reference'

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
      page.getByRole('cell', { name: REFERENCE_NUMBER, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000002', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000003', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'SUBMITTED', exact: true })
    ).toBeVisible()
    await expect(page.getByRole('cell', { name: 'DRAFT' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'AMEND' })).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000005', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', {
        name: 'SUBMITTED_ACTION_REQUIRED',
        exact: true
      })
    ).toBeVisible()

    // The soft-deleted stub notification must never appear.
    await expect(
      page.getByRole('cell', { name: 'GBN-AG-26-000004', exact: true })
    ).toHaveCount(0)
  })

  test('offers Create new under the heading, opening the type question with nothing selected and Germinal products second', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    await expect(
      page.getByRole('button', { name: CREATE_NEW, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Start a new notification' })
    ).toHaveCount(0)

    await page.getByRole('button', { name: CREATE_NEW, exact: true }).click()

    await expect(page).toHaveURL(/\/notification-type$/)
    await expect(
      page.getByRole('heading', { level: 1, name: /What are you importing\?/ })
    ).toBeVisible()

    const radios = page.getByRole('radio')
    await expect(radios).toHaveCount(5)
    await expect(radios.nth(1)).toHaveAccessibleName(
      'Germinal products (semen, ova, embryos)'
    )
    for (let index = 0; index < 5; index++) {
      await expect(radios.nth(index)).not.toBeChecked()
    }
  })

  test('still offers Create new after a search that matches nothing, and it opens the type question', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    await page.getByLabel(SEARCH_LABEL).fill(UNMATCHED_REFERENCE)
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page.getByText(NO_RESULTS)).toBeVisible()
    await expect(
      page.getByRole('button', { name: CREATE_NEW, exact: true })
    ).toBeVisible()

    await page.getByRole('button', { name: CREATE_NEW, exact: true }).click()

    await expect(
      page.getByRole('heading', { level: 1, name: /What are you importing\?/ })
    ).toBeVisible()
  })

  test('offers Use template beside Create new, linking to Manage templates in the live animals service', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    const useTemplate = page.getByRole('button', {
      name: USE_TEMPLATE,
      exact: true
    })

    await expect(useTemplate).toBeVisible()
    await expect(useTemplate).toHaveAttribute('href', MANAGE_TEMPLATES_HREF)
    await expect(
      page.getByRole('button', { name: CREATE_NEW, exact: true })
    ).toBeVisible()
  })

  test('still offers Use template after a search that matches nothing', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    await page.getByLabel(SEARCH_LABEL).fill(UNMATCHED_REFERENCE)
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page.getByText(NO_RESULTS)).toBeVisible()

    const useTemplate = page.getByRole('button', {
      name: USE_TEMPLATE,
      exact: true
    })

    await expect(useTemplate).toBeVisible()
    await expect(useTemplate).toHaveAttribute('href', MANAGE_TEMPLATES_HREF)
  })

  test('still offers Create new and Use template when the notifications cannot be loaded', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')
    await page.getByLabel(SEARCH_LABEL).fill(UNAVAILABLE_REFERENCE)
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(
      page.getByText(
        'Sorry, there is a problem with the service. Try again in a few minutes.'
      )
    ).toBeVisible()
    await expect(page.getByRole('cell')).toHaveCount(0)

    const heading = page.getByRole('heading', {
      name: 'Dashboard',
      exact: true
    })
    const createNew = page.getByRole('button', {
      name: CREATE_NEW,
      exact: true
    })
    const useTemplate = page.getByRole('button', {
      name: USE_TEMPLATE,
      exact: true
    })
    const searchField = page.getByLabel(SEARCH_LABEL)
    await expect(createNew).toBeVisible()
    await expect(useTemplate).toBeVisible()

    const [headingBox, createNewBox, useTemplateBox, searchBox] =
      await Promise.all([
        heading.boundingBox(),
        createNew.boundingBox(),
        useTemplate.boundingBox(),
        searchField.boundingBox()
      ])
    expect(createNewBox.y).toBeGreaterThan(headingBox.y)
    expect(createNewBox.y).toBeLessThan(searchBox.y)
    expect(useTemplateBox.y).toBe(createNewBox.y)
    expect(useTemplateBox.x).toBeGreaterThan(createNewBox.x)
    await expect(useTemplate).toHaveAttribute('href', MANAGE_TEMPLATES_HREF)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signIn(page)
    await page.goto('/')

    await expectNoSeriousOrCriticalViolations(page, 'dashboard')
  })

  test('opening a submitted notification links into the read-only notification-view page (AC3)', async ({
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

  test('opening a notification submitted with action required links into the read-only notification-view page (AC3)', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    const link = page.getByRole('link', { name: /View.*GBN-AG-26-000005/s })
    await expect(link).toHaveAttribute(
      'href',
      'http://localhost:3000/live-animals/notifications/GBN-AG-26-000005/notification-view'
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
      'http://localhost:3000/live-animals/notifications/GBN-AG-26-000002'
    )
  })

  test('searching by complete reference returns only the matching notification (AC4)', async ({
    page
  }) => {
    await signIn(page)
    await page.goto('/')

    await page.getByLabel(SEARCH_LABEL).fill(REFERENCE_NUMBER)
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(
      page.getByRole('cell', { name: REFERENCE_NUMBER, exact: true })
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

    await page.getByLabel(SEARCH_LABEL).fill(UNMATCHED_REFERENCE)
    await page.getByRole('button', { name: 'Search' }).click()

    await expect(page.getByText(NO_RESULTS)).toBeVisible()
  })
})
