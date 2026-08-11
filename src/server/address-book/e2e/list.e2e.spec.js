import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

const ORG_DEFAULT = 'stub-org-1'
const ORG_EMPTY = 'stub-org-empty'
const ORG_PAGINATED = 'stub-org-paginated'

/**
 * Signs in via the stub-auth route (see server/auth/stub-sign-in.js) - no
 * real Defra ID stub involved, only reachable when AUTH_STUB_MODE=true.
 */
async function signIn(page, { organisationId = ORG_DEFAULT } = {}) {
  await page.goto(
    `/auth/stub-sign-in?organisationId=${encodeURIComponent(organisationId)}`
  )
}

test.describe('navigation', () => {
  test('Dashboard and Address book links are visible and navigate correctly', async ({
    page
  }) => {
    await signIn(page, { organisationId: ORG_DEFAULT })

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    const addressBookLink = page.getByRole('link', { name: 'Address book' })
    await expect(addressBookLink).toBeVisible()

    await addressBookLink.click()

    await expect(page).toHaveURL(/\/address-book$/)
    await expect(
      page.getByRole('heading', { name: 'Address book', exact: true })
    ).toBeVisible()
  })
})

test.describe('list and pagination', () => {
  test('renders addresses in a table with Name, Address and Country columns', async ({
    page
  }) => {
    await signIn(page, { organisationId: ORG_DEFAULT })
    await page.goto('/address-book')

    const table = page.getByRole('table')
    await expect(
      table.getByRole('columnheader', { name: 'Name' })
    ).toBeVisible()
    await expect(
      table.getByRole('columnheader', { name: 'Address' })
    ).toBeVisible()
    await expect(
      table.getByRole('columnheader', { name: 'Country' })
    ).toBeVisible()
    await expect(
      table.getByRole('cell', { name: 'Stub Farm 1', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Add a new address' })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signIn(page, { organisationId: ORG_DEFAULT })
    await page.goto('/address-book')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      seriousOrCritical,
      `Address book list has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })

  test('paginates when there are more than 25 addresses', async ({ page }) => {
    await signIn(page, { organisationId: ORG_PAGINATED })
    await page.goto('/address-book')

    await expect(page.getByText('Showing 1-25 of 30')).toBeVisible()

    await page.getByRole('link', { name: 'Page 2' }).click()

    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByText('Showing 26-30 of 30')).toBeVisible()
  })
})

test.describe('empty state', () => {
  test('shows an empty-state message and an option to add one', async ({
    page
  }) => {
    await signIn(page, { organisationId: ORG_EMPTY })
    await page.goto('/address-book')

    await expect(page.getByText('You have no addresses yet.')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Add a new address' })
    ).toBeVisible()
  })
})
