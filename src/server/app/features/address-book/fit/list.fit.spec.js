import { test, expect } from '@playwright/test'

import { addValidAddressToFreshOrganisation } from './address-form.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import {
  NO_RESULTS_LINE,
  ONE_MATCH_LINE,
  UNKNOWN_ADDRESS_TYPE,
  expectEmptyAddressBookList,
  expectNamesListed,
  openFilterDisclosure,
  expectFilterDisclosureOpensAndCloses,
  openAddressBookList,
  tabPanelHeadingOf,
  resultsLineOf,
  searchAndExpectMatches,
  searchAndExpectQuery,
  searchAndExpectSingleMatch,
  searchFieldOf,
  followTab,
  typeSelectOf,
  selectedTabOf,
  tabLinksOf
} from './address-book-list.js'
import { expectDashboard } from './dashboard.js'
import { signIn } from '../../../../../../fit/sign-in.js'
import { seedAddress, seedAddressLines } from './seed-address.js'
import {
  ADDRESS_TYPES,
  TYPED_SEED
} from '../../../services/address-book/index.js'
import { DEFAULT_ADDRESS_BOOK_TAB } from '../address-book-tabs.js'
import { addressBookPath, addressTypeStartPath } from '../../../shared/paths.js'

const ORG_DEFAULT = 'stub-org-1'
const ORG_EMPTY = 'stub-org-empty'
const ORG_PAGINATED = 'stub-org-paginated'
const ADD_A_NEW_ADDRESS = 'Add a new address'
const FARM_12 = 'Stub Farm 12'
const FIRST_PAGE_LINE = 'Showing 1-8 of 30'
const TWO_ADDRESSES_LINE = 'Showing 1-2 of 2'

const paginationOf = (page) =>
  page.getByRole('navigation', { name: 'Pagination' })

test.describe('navigation', () => {
  test('Dashboard and Address book links are visible and navigate correctly', async ({
    page
  }) => {
    await signIn(page, { organisationId: ORG_DEFAULT })

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    const addressBookLink = page.getByRole('link', { name: 'Address book' })
    await expect(addressBookLink).toBeVisible()

    await addressBookLink.click()

    await expect(page).toHaveURL(addressBookPath())
    await expect(
      page.getByRole('heading', { name: 'Address book', exact: true })
    ).toBeVisible()

    await page.getByRole('link', { name: 'Dashboard' }).click()

    await expectDashboard(page)
  })
})

test.describe('list and pagination', () => {
  test('renders addresses in a table with Name, Type, Address, Country and Action columns', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

    const table = page.getByRole('table')
    await expect(table.getByRole('columnheader')).toHaveText([
      'Name',
      'Type',
      'Address',
      'Country',
      'Action'
    ])
    await expect(
      table.getByRole('cell', { name: seedAddress.name, exact: true })
    ).toBeVisible()
    await expect(
      table.getByRole('cell', {
        name: seedAddressLines.join(', '),
        exact: true
      })
    ).toBeVisible()
    await expect(
      table.getByRole('cell', { name: 'United Kingdom', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: ADD_A_NEW_ADDRESS })
    ).toBeVisible()
  })

  test('clicking Add a new address opens Choose an address type', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

    await page.getByRole('button', { name: ADD_A_NEW_ADDRESS }).click()

    await expect(page).toHaveURL(addressTypeStartPath())
    await expect(
      page.getByRole('heading', { name: 'Choose an address type' })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

    await expectNoSeriousOrCriticalViolations(page, 'Address book list')
  })

  test('lists 8 addresses a page', async ({ page }) => {
    await openAddressBookList(page, { organisationId: ORG_PAGINATED })

    await expect(resultsLineOf(page)).toHaveText(FIRST_PAGE_LINE)
    await expect(page.getByRole('row')).toHaveCount(9)

    await page.getByRole('link', { name: 'Page 2' }).click()

    await expect(page).toHaveURL(/page=2/)
    await expect(resultsLineOf(page)).toHaveText('Showing 9-16 of 30')
  })

  test('shows the last page when the page number is past the last page', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: ORG_PAGINATED,
      pageNumber: 99
    })

    await expect(resultsLineOf(page)).toHaveText('Showing 25-30 of 30')
    await expect(page.getByRole('row')).toHaveCount(7)
    await expect(page.getByRole('link', { name: 'Page 4' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  test('shows the first page when the page number is 0', async ({ page }) => {
    await openAddressBookList(page, {
      organisationId: ORG_PAGINATED,
      pageNumber: 0
    })

    await expect(resultsLineOf(page)).toHaveText(FIRST_PAGE_LINE)
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
      page.getByRole('button', { name: ADD_A_NEW_ADDRESS })
    ).toBeVisible()
  })

  test('shows the name on two lines and the address on one line per stored line', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })

    const nameCell = page.getByRole('cell', {
      name: seedAddress.name,
      exact: true
    })
    await expect(nameCell).toHaveText(
      new RegExp(`^${seedAddress.name.replace(' ', '\n')}$`),
      { useInnerText: true }
    )
    const addressCell = page.getByRole('cell', {
      name: seedAddressLines.join(', '),
      exact: true
    })
    await expect(addressCell).toHaveText(
      new RegExp(`^${seedAddressLines.join(',\n')}$`),
      {
        useInnerText: true
      }
    )
  })
})

const ORG_TYPED = 'stub-org-typed'

const TABS = [
  {
    label: 'Origin and Consignor',
    addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
    heading: 'Origin and Consignor addresses',
    names: [TYPED_SEED.originAndConsignor.name, TYPED_SEED.placeOfOrigin.name]
  },
  {
    label: 'Destination, Consignee and Importer',
    addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
    heading: 'Destination, Consignee and Importer addresses',
    names: [TYPED_SEED.consigneeAndDestination.name, TYPED_SEED.importer.name]
  },
  {
    label: 'Branch',
    addressType: ADDRESS_TYPES.BRANCH,
    heading: 'Branch addresses',
    names: [TYPED_SEED.branch.name, TYPED_SEED.branchDepot.name]
  }
]

const [ORIGIN_TAB, , BRANCH_TAB] = TABS

const expectTabsInOrderWithSelected = async (page, selectedLabel) => {
  await expect(tabLinksOf(page)).toHaveText(TABS.map(({ label }) => label))
  await expect(selectedTabOf(page)).toHaveText(selectedLabel)
}

test.describe('address type tabs', () => {
  test('shows the three tabs in order with Origin and Consignor selected when no tab is chosen', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_TYPED })

    await expectTabsInOrderWithSelected(page, ORIGIN_TAB.label)
    await expect(tabPanelHeadingOf(page)).toHaveText(ORIGIN_TAB.heading)
  })

  test('shows Origin and Consignor selected when the tab is unknown', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: ORG_TYPED,
      addressType: UNKNOWN_ADDRESS_TYPE
    })

    await expectTabsInOrderWithSelected(page, ORIGIN_TAB.label)
  })

  for (const { label, addressType, heading, names } of TABS) {
    test(`opens the ${label} tab with its own panel heading and exactly its addresses`, async ({
      page
    }) => {
      await openAddressBookList(page, {
        organisationId: ORG_TYPED,
        addressType
      })

      await expectTabsInOrderWithSelected(page, label)
      await expect(tabPanelHeadingOf(page)).toHaveText(heading)
      await expectNamesListed(page, names)
    })
  }

  test('shows each address with the labels of its roles in the Type column', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_TYPED })

    await expect(
      page
        .getByRole('row', {
          name: new RegExp(TYPED_SEED.originAndConsignor.name)
        })
        .getByRole('cell')
        .nth(1)
    ).toHaveText('Place of origin, Consignor')

    await openAddressBookList(page, {
      organisationId: ORG_TYPED,
      addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
    })

    await expect(
      page
        .getByRole('row', {
          name: new RegExp(TYPED_SEED.consigneeAndDestination.name)
        })
        .getByRole('cell')
        .nth(1)
    ).toHaveText('Consignee, Place of destination')
  })

  test('lists the default seed address on the Origin and Consignor tab only', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })
    await expect(
      page.getByRole('cell', { name: seedAddress.name, exact: true })
    ).toBeVisible()

    for (const addressType of [
      ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
      ADDRESS_TYPES.BRANCH
    ]) {
      await openAddressBookList(page, {
        organisationId: ORG_DEFAULT,
        addressType
      })

      await expect(resultsLineOf(page)).toHaveText(NO_RESULTS_LINE)
    }
  })

  test('keeps the Branch tab, its heading and only its matches when a search is submitted', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: ORG_TYPED,
      addressType: ADDRESS_TYPES.BRANCH
    })

    await searchAndExpectSingleMatch(page, 'depot', {
      addressType: ADDRESS_TYPES.BRANCH,
      matchedCellText: TYPED_SEED.branchDepot.name
    })

    await expectTabsInOrderWithSelected(page, BRANCH_TAB.label)
    await expect(tabPanelHeadingOf(page)).toHaveText(BRANCH_TAB.heading)
  })

  test('has no serious or critical axe violations on the Branch tab', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: ORG_TYPED,
      addressType: ADDRESS_TYPES.BRANCH
    })

    await expectNoSeriousOrCriticalViolations(page, 'Address book Branch tab')
  })
})

test.describe('address type tabs without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('loads the tab that is followed', async ({ page }) => {
    await openAddressBookList(page, { organisationId: ORG_TYPED })

    for (const { label, heading, names } of TABS) {
      await followTab(page, label)

      await expectTabsInOrderWithSelected(page, label)
      await expect(tabPanelHeadingOf(page)).toHaveText(heading)
      await expectNamesListed(page, names)
    }
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
    test(`lists only the matches, with the term in the address book URL, when submitted with ${how}`, async ({
      page
    }) => {
      await openAddressBookList(page, { organisationId: ORG_PAGINATED })

      await searchAndExpectSingleMatch(page, 'farm 12', {
        submitWith,
        matchedCellText: FARM_12
      })
    })
  }

  test('lists the matches across all pages and keeps the term on the next page', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_PAGINATED })

    await searchAndExpectMatches(page, 'Farm 1', {
      submitWith: 'button',
      resultsLine: 'Showing 1-8 of 11'
    })
    await page.getByRole('link', { name: 'Page 2' }).click()

    await expect(page).toHaveURL(
      `${addressBookPath()}?addressType=${DEFAULT_ADDRESS_BOOK_TAB.addressType}&q=Farm+1&page=2`
    )
    await expect(resultsLineOf(page)).toHaveText('Showing 9-11 of 11')
  })

  test('counts the matches of a search that fits on one page and shows no pagination', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_PAGINATED })

    await searchAndExpectMatches(page, 'farm 3', {
      submitWith: 'button',
      resultsLine: TWO_ADDRESSES_LINE
    })

    await expect(paginationOf(page)).toHaveCount(0)
  })

  test('finds an address by a term inside its address line 1', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_PAGINATED })

    await searchAndExpectSingleMatch(page, '12 stub way', {
      matchedCellText: FARM_12
    })
  })

  test('finds the addresses in a country by part of its name', async ({
    page
  }) => {
    await addValidAddressToFreshOrganisation(page, {
      organisationPrefix: 'stub-org-list-country',
      overrides: { name: 'Paris Depot', countryCode: 'FR' }
    })
    await expect(resultsLineOf(page)).toHaveText(TWO_ADDRESSES_LINE)

    await searchAndExpectSingleMatch(page, 'fran', {
      matchedCellText: 'France'
    })
  })

  test('leaves the list as it is while text is typed and not yet submitted', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_PAGINATED })
    await openFilterDisclosure(page)

    await searchFieldOf(page).fill('farm 12')

    await expect(page).toHaveURL(addressBookPath())
    await expect(resultsLineOf(page)).toHaveText(FIRST_PAGE_LINE)
  })

  test('Clear search after a search returns to the whole selected tab with an empty Search field', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_DEFAULT })
    await searchAndExpectQuery(page, 'stub', { submitWith: 'button' })

    await page.getByRole('link', { name: 'Clear search' }).click()

    await expect(page).toHaveURL(
      `${addressBookPath()}?addressType=${DEFAULT_ADDRESS_BOOK_TAB.addressType}`
    )
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
    test(`lists only the matches, with the term in the address book URL, when submitted with ${how} and JavaScript is off`, async ({
      page
    }) => {
      await openAddressBookList(page, { organisationId: ORG_PAGINATED })

      await searchAndExpectSingleMatch(page, 'farm 12', {
        submitWith,
        matchedCellText: FARM_12
      })
    })
  }
})

const CONSIGNOR_ROLE = { label: 'Consignor', value: 'CONSIGNOR' }
const CONSIGNEE_ROLE = { label: 'Consignee', value: 'CONSIGNEE' }
const IMPORTER_ROLE = { label: 'Importer', value: 'IMPORTER' }
const NO_TYPE_VALUE = ''

const expectTypeChosen = (page, value) =>
  expect(typeSelectOf(page)).toHaveValue(value)

test.describe('type filter', () => {
  for (const { submitWith, how } of SUBMIT_METHODS) {
    test(`lists only the addresses of the tab holding the Type, and keeps the tab and the Type chosen, when submitted with ${how}`, async ({
      page
    }) => {
      await openAddressBookList(page, { organisationId: ORG_TYPED })

      await searchAndExpectMatches(page, '', {
        submitWith,
        role: CONSIGNOR_ROLE,
        resultsLine: ONE_MATCH_LINE
      })

      await expectNamesListed(page, [TYPED_SEED.originAndConsignor.name])
      await expect(paginationOf(page)).toHaveCount(0)
      await expectTabsInOrderWithSelected(page, ORIGIN_TAB.label)
      await openFilterDisclosure(page)
      await expectTypeChosen(page, CONSIGNOR_ROLE.value)
    })
  }

  test('lists only the Destination, Consignee and Importer addresses holding the Consignee Type', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: ORG_TYPED,
      addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
    })

    await searchAndExpectMatches(page, '', {
      addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
      role: CONSIGNEE_ROLE,
      resultsLine: ONE_MATCH_LINE
    })

    await expectNamesListed(page, [TYPED_SEED.consigneeAndDestination.name])
  })

  test('leaves the URL and the whole tab listed when a Type is chosen and not submitted', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_TYPED })
    await openFilterDisclosure(page)

    await typeSelectOf(page).selectOption({ label: CONSIGNOR_ROLE.label })

    await expect(page).toHaveURL(addressBookPath())
    await expect(resultsLineOf(page)).toHaveText(TWO_ADDRESSES_LINE)
    await expectNamesListed(page, ORIGIN_TAB.names)
  })

  test('keeps the search and clears the Type when another tab is followed', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: ORG_TYPED,
      addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
    })
    await searchAndExpectSingleMatch(page, 'Stub', {
      addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
      role: IMPORTER_ROLE,
      matchedCellText: TYPED_SEED.importer.name
    })

    await followTab(page, ORIGIN_TAB.label)

    await expect(resultsLineOf(page)).toHaveText(TWO_ADDRESSES_LINE)
    await expectNamesListed(page, ORIGIN_TAB.names)
    await openFilterDisclosure(page)
    await expect(searchFieldOf(page)).toHaveValue('Stub')
    await expectTypeChosen(page, NO_TYPE_VALUE)
  })

  test('finds an address by the label of one of its roles', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_TYPED })

    await searchAndExpectSingleMatch(page, 'consignor', {
      matchedCellText: TYPED_SEED.originAndConsignor.name
    })
    await expect(
      page.getByRole('cell', {
        name: 'Place of origin, Consignor',
        exact: true
      })
    ).toBeVisible()
    await searchAndExpectMatches(page, 'place of origin', {
      submitWith: 'button',
      resultsLine: TWO_ADDRESSES_LINE
    })

    await expectNamesListed(page, ORIGIN_TAB.names)
  })

  test('has no serious or critical axe violations with a Type chosen and the disclosure open', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_TYPED })
    await searchAndExpectQuery(page, '', {
      submitWith: 'button',
      role: CONSIGNOR_ROLE
    })
    await openFilterDisclosure(page)

    await expectNoSeriousOrCriticalViolations(
      page,
      'Address book list with a Type chosen and filter open'
    )
  })
})

test.describe('type filter without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('lists only the addresses of the tab holding the Type when submitted with the Search button', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_TYPED })

    await searchAndExpectMatches(page, '', {
      submitWith: 'button',
      role: CONSIGNOR_ROLE,
      resultsLine: ONE_MATCH_LINE
    })

    await expectNamesListed(page, [TYPED_SEED.originAndConsignor.name])
  })
})

test.describe('empty book', () => {
  test('shows Showing 0 of 0 and the table headings with no rows', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_EMPTY })

    await expectEmptyAddressBookList(page)
  })
})
