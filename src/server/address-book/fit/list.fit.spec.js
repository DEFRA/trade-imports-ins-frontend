import { test, expect } from '@playwright/test'

import {
  expectNoSeriousOrCriticalAxeViolations,
  signIn
} from './address-form.js'

const ORG_DEFAULT = 'stub-org-1'
const ORG_EMPTY = 'stub-org-empty'
const ORG_PAGINATED = 'stub-org-paginated'

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
      table.getByRole('cell', {
        name: '1 Stub Way, Stubton, ST1 1UB',
        exact: true
      })
    ).toBeVisible()
    await expect(
      table.getByRole('cell', { name: 'United Kingdom', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Add a new address' })
    ).toBeVisible()
  })

  test('clicking Add a new address navigates to the add form', async ({
    page
  }) => {
    await signIn(page, { organisationId: ORG_DEFAULT })
    await page.goto('/address-book')

    await page.getByRole('button', { name: 'Add a new address' }).click()

    await expect(page).toHaveURL(/\/address-book\/add$/)
    await expect(
      page.getByRole('heading', { name: 'Add address details' })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await signIn(page, { organisationId: ORG_DEFAULT })
    await page.goto('/address-book')

    await expectNoSeriousOrCriticalAxeViolations(page, 'Address book list')
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
