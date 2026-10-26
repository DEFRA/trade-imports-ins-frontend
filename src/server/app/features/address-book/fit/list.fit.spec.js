import { test, expect } from '@playwright/test'

import { expectNoSeriousOrCriticalViolations } from './axe.js'
import {
  expectEmptyAddressBookList,
  openFilterDisclosure,
  expectFilterDisclosureOpensAndCloses,
  openAddressBookList,
  searchAndExpectQuery,
  searchFieldOf
} from './address-book-list.js'
import { signIn } from '../../../../../../fit/sign-in.js'
import { SEED_ADDRESS_NAME } from './seed-address.js'

const ORG_DEFAULT = 'stub-org-1'
const ORG_EMPTY = 'stub-org-empty'
const ORG_PAGINATED = 'stub-org-paginated'
const ADD_NEW_ADDRESS = 'Add a new address'

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
  test('renders addresses in a table with Name, Address, Country and Action columns', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

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
      table.getByRole('columnheader', { name: 'Action' })
    ).toBeVisible()
    await expect(
      table.getByRole('cell', { name: SEED_ADDRESS_NAME, exact: true })
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
      page.getByRole('button', { name: ADD_NEW_ADDRESS })
    ).toBeVisible()
  })

  test('clicking Add a new address navigates to the add form', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

    await page.getByRole('button', { name: ADD_NEW_ADDRESS }).click()

    await expect(page).toHaveURL(/\/address-book\/add$/)
    await expect(
      page.getByRole('heading', { name: 'Add address details' })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

    await expectNoSeriousOrCriticalViolations(page, 'Address book list')
  })

  test('paginates when there are more than 25 addresses', async ({ page }) => {
    await openAddressBookList(page, { organisationId: ORG_PAGINATED })

    await expect(page.getByText('Showing 1-25 of 30')).toBeVisible()

    await page.getByRole('link', { name: 'Page 2' }).click()

    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByText('Showing 26-30 of 30')).toBeVisible()
  })
})

test.describe('intro and cells', () => {
  test('shows the intro and the Add a new address button', async ({ page }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

    await expect(
      page.getByText(
        'Manage your addresses for use across all your import notifications',
        { exact: true }
      )
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: ADD_NEW_ADDRESS })
    ).toBeVisible()
  })

  test('shows the name on two lines and the address on one line per stored line', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

    const nameCell = page.getByRole('cell', {
      name: SEED_ADDRESS_NAME,
      exact: true
    })
    await expect(nameCell).toHaveText(/^Stub\nFarm 1$/, { useInnerText: true })
    const addressCell = page.getByRole('cell', {
      name: '1 Stub Way, Stubton, ST1 1UB',
      exact: true
    })
    await expect(addressCell).toHaveText(/^1 Stub Way,\nStubton,\nST1 1UB$/, {
      useInnerText: true
    })
  })
})

const SUBMIT_METHODS = [
  { submitWith: 'button', how: 'the Search button' },
  { submitWith: 'enter', how: 'Enter in the Search field' }
]

test.describe('filter addresses', () => {
  test('keeps the Search field hidden until Filter addresses is opened, and hides it again when closed', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

    await expectFilterDisclosureOpensAndCloses(page)
  })

  test('describes the Search field with the hint Search by name, address or country', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

    await openFilterDisclosure(page)

    await expect(searchFieldOf(page)).toHaveAccessibleDescription(
      'Search by name, address or country'
    )
  })

  for (const { submitWith, how } of SUBMIT_METHODS) {
    test(`puts the term in the address book URL when submitted with ${how}`, async ({
      page
    }) => {
      await openAddressBookList(page, { organisationId: ORG_DEFAULT })

      await searchAndExpectQuery(page, 'stub', { submitWith })
    })
  }

  test('Clear search after a search returns to the whole address book with an empty Search field', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })
    await searchAndExpectQuery(page, 'stub', { submitWith: 'button' })

    await page.getByRole('link', { name: 'Clear search' }).click()

    await expect(page).toHaveURL('/address-book')
    await openFilterDisclosure(page)
    await expect(searchFieldOf(page)).toHaveValue('')
  })

  test('has no serious or critical axe violations with the disclosure open', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })
    await openFilterDisclosure(page)

    await expectNoSeriousOrCriticalViolations(
      page,
      'Address book list with filter open'
    )
  })
})

test.describe('filter addresses without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('opens and closes the disclosure', async ({ page }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

    await expectFilterDisclosureOpensAndCloses(page)
  })

  for (const { submitWith, how } of SUBMIT_METHODS) {
    test(`puts the term in the address book URL when submitted with ${how} and JavaScript is off`, async ({
      page
    }) => {
      await openAddressBookList(page, { organisationId: ORG_DEFAULT })

      await searchAndExpectQuery(page, 'stub', { submitWith })
    })
  }
})

test.describe('empty book', () => {
  test('shows Showing 0 of 0 and the table headings with no rows', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_EMPTY })

    await expectEmptyAddressBookList(page)
  })
})
