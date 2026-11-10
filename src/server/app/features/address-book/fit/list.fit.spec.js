import { test, expect } from '@playwright/test'

import {
  addValidAddressToFreshOrganisation,
  openAddForm,
  saveValidAddress,
  validAddress
} from './address-form.js'
import { expectNoSeriousOrCriticalViolations } from '../../../../../../fit/axe.js'
import {
  NO_RESULTS_LINE,
  ONE_MATCH_LINE,
  UNSUPPORTED_ADDRESS_TYPE,
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
  tabLinksOf,
  TABLE_HEADINGS,
  TRANSPORTER_TABLE_HEADINGS,
  transporterAddressCellOf,
  typeCellOf
} from './address-book-list.js'
import { expectDashboard } from '../../dashboard/fit/dashboard.js'
import { signIn } from '../../../../../../fit/sign-in.js'
import { seedAddress, seedAddressLines } from './seed-address.js'
import {
  ADDRESS_TYPES,
  ROLES,
  TYPED_SEED
} from '../../../services/address-book/index.js'
import { DEFAULT_ADDRESS_BOOK_TAB } from '../address-book-tabs.js'
import { addressBookPath, addressTypeStartPath } from '../../../shared/paths.js'
import { copy } from '../copy/copy.en.js'
import {
  fillCommercialTransporterForm,
  fillPrivateTransporterForm,
  openCommercialTransporterForm,
  openPrivateTransporterForm,
  saveTransporterButton,
  validCommercialTransporter,
  validPrivateTransporter
} from './transporter-form.js'

const ADD_A_NEW_ADDRESS = 'Add a new address'
const FARM_12 = 'Stub Farm 12'
const FIRST_PAGE_LINE = 'Showing 1-8 of 30'
const TWO_ADDRESSES_LINE = 'Showing 1-2 of 2'

const addPrivateAndCommercialTransporters = async (page, organisationId) => {
  await openPrivateTransporterForm(page, organisationId)
  await fillPrivateTransporterForm(page)
  await saveTransporterButton(page, copy.privateTransporterForm).click()

  await openCommercialTransporterForm(page, organisationId)
  await fillCommercialTransporterForm(page)
  await saveTransporterButton(page, copy.commercialTransporterForm).click()
}

const paginationOf = (page) =>
  page.getByRole('navigation', { name: 'Pagination' })

test.describe('navigation', () => {
  test('Dashboard and Address book links are visible and navigate correctly', async ({
    page
  }) => {
    await signIn(page, { organisationId: 'stub-org-list-navigation' })

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
  test('renders the seed address in a table with Name, Type, Address, Country and Action columns', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: 'stub-org-list-columns' })

    const table = page.getByRole('table')
    await expect(table.getByRole('columnheader')).toHaveText(TABLE_HEADINGS)
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
  })

  test('clicking Add a new address opens Choose an address type', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: 'stub-org-list-add-link'
    })

    await page.getByRole('button', { name: ADD_A_NEW_ADDRESS }).click()

    await expect(page).toHaveURL(addressTypeStartPath())
    await expect(
      page.getByRole('heading', { name: 'Choose an address type' })
    ).toBeVisible()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await openAddressBookList(page, { organisationId: 'stub-org-list-axe' })

    await expectNoSeriousOrCriticalViolations(page, 'Address book list')
  })

  test('lists 8 addresses a page', async ({ page }) => {
    await openAddressBookList(page, {
      organisationId: 'stub-org-list-pages-paginated'
    })

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
      organisationId: 'stub-org-list-past-last-page-paginated',
      pageNumber: 99
    })

    await expect(resultsLineOf(page)).toHaveText('Showing 25-30 of 30')
    await expect(page.getByRole('row')).toHaveCount(7)
    await expect(page.getByRole('link', { name: 'Page 4' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  for (const pageNumber of [0, 'abc']) {
    test(`shows the first page when the page number is ${pageNumber}`, async ({
      page
    }) => {
      await openAddressBookList(page, {
        organisationId: `stub-org-list-page-${pageNumber}-paginated`,
        pageNumber
      })

      await expect(resultsLineOf(page)).toHaveText(FIRST_PAGE_LINE)
      await expect(page.getByRole('row')).toHaveCount(9)
    })
  }
})

test.describe('intro and cells', () => {
  test('shows the intro and the Add a new address button', async ({ page }) => {
    await openAddressBookList(page, { organisationId: 'stub-org-list-intro' })

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
    await openAddressBookList(page, { organisationId: 'stub-org-list-cells' })

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

const rolesPagedOrganisation = (purpose) =>
  `stub-org-list-${purpose}-roles-paged`

const numberedNames = (namePrefix, count) =>
  Array.from({ length: count }, (_, index) => `${namePrefix} ${index + 1}`)

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

const [ORIGIN_TAB, DESTINATION_TAB, BRANCH_TAB] = TABS

const ADDRESS_BOOK_TAB_LABELS = [
  ORIGIN_TAB.label,
  DESTINATION_TAB.label,
  'Transporter',
  BRANCH_TAB.label
]

const expectTabsInOrderWithSelected = async (page, selectedLabel) => {
  await expect(tabLinksOf(page)).toHaveText(ADDRESS_BOOK_TAB_LABELS)
  await expect(selectedTabOf(page)).toHaveText(selectedLabel)
}

const expectAddressColumnsWithHiddenAction = async (page) => {
  const columnHeadings = page.getByRole('table').getByRole('columnheader')
  await expect(columnHeadings).toHaveText(TABLE_HEADINGS)
  await expect(
    columnHeadings.last().locator('.govuk-visually-hidden')
  ).toHaveText('Action')
}

test.describe('address type tabs', () => {
  test('shows the four tabs in order with Origin and Consignor selected when no tab is chosen', async ({
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
      addressType: UNSUPPORTED_ADDRESS_TYPE
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

  test('shows Place of origin, Consignor and Consignee, Place of destination in the Type column under the columns Name, Type, Address, Country and a visually hidden Action', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_TYPED })

    await expect(
      typeCellOf(page, TYPED_SEED.originAndConsignor.name)
    ).toHaveText('Place of origin, Consignor')
    await expectAddressColumnsWithHiddenAction(page)

    await openAddressBookList(page, {
      organisationId: ORG_TYPED,
      addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
    })

    await expect(
      typeCellOf(page, TYPED_SEED.consigneeAndDestination.name)
    ).toHaveText('Consignee, Place of destination')
    await expectAddressColumnsWithHiddenAction(page)
  })

  test('labels each of the six roles held alone in the Type column', async ({
    page
  }) => {
    const organisationId = `stub-org-list-role-labels-${crypto.randomUUID()}-typed`
    await openAddressBookList(page, { organisationId })
    for (const { addressType, role, name } of [
      {
        addressType: ORIGIN_TAB.addressType,
        role: ROLES.CONSIGNOR,
        name: 'Stub Consignor Yard'
      },
      {
        addressType: DESTINATION_TAB.addressType,
        role: ROLES.CONSIGNEE,
        name: 'Stub Consignee Yard'
      },
      {
        addressType: DESTINATION_TAB.addressType,
        role: ROLES.PLACE_OF_DESTINATION,
        name: 'Stub Destination Yard'
      }
    ]) {
      await openAddForm(page, addressType)
      await saveValidAddress(page, {
        addressType,
        roles: [role],
        overrides: { name }
      })
    }

    for (const { addressType, name, typeLabel } of [
      {
        addressType: ORIGIN_TAB.addressType,
        name: TYPED_SEED.placeOfOrigin.name,
        typeLabel: 'Place of origin'
      },
      {
        addressType: ORIGIN_TAB.addressType,
        name: 'Stub Consignor Yard',
        typeLabel: 'Consignor'
      },
      {
        addressType: DESTINATION_TAB.addressType,
        name: 'Stub Consignee Yard',
        typeLabel: 'Consignee'
      },
      {
        addressType: DESTINATION_TAB.addressType,
        name: TYPED_SEED.importer.name,
        typeLabel: 'Importer'
      },
      {
        addressType: DESTINATION_TAB.addressType,
        name: 'Stub Destination Yard',
        typeLabel: 'Place of destination'
      },
      {
        addressType: BRANCH_TAB.addressType,
        name: TYPED_SEED.branch.name,
        typeLabel: 'Branch'
      }
    ]) {
      await openAddressBookList(page, { organisationId, addressType })

      await expect(typeCellOf(page, name)).toHaveText(typeLabel)
    }
  })

  test('lists the default seed address on the Origin and Consignor tab only', async ({
    page
  }) => {
    const organisationId = 'stub-org-list-default-tab-only'
    await openAddressBookList(page, { organisationId })
    await expect(
      page.getByRole('cell', { name: seedAddress.name, exact: true })
    ).toBeVisible()

    for (const addressType of [
      ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
      ADDRESS_TYPES.BRANCH
    ]) {
      await openAddressBookList(page, {
        organisationId,
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

  test('keeps the Branch tab and lists only its matches for a search that also matches another tab, and its page links keep the tab and the search', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: rolesPagedOrganisation('tab-search'),
      addressType: ADDRESS_TYPES.BRANCH
    })

    await searchAndExpectMatches(page, 'hill', {
      submitWith: 'button',
      addressType: ADDRESS_TYPES.BRANCH,
      resultsLine: 'Showing 1-8 of 9'
    })
    await expectTabsInOrderWithSelected(page, BRANCH_TAB.label)
    await expectNamesListed(page, numberedNames('Stub Hill Depot', 8))

    await page.getByRole('link', { name: 'Page 2' }).click()

    await expect(page).toHaveURL(
      `${addressBookPath()}?addressType=${ADDRESS_TYPES.BRANCH}&q=hill&page=2`
    )
    await expect(resultsLineOf(page)).toHaveText('Showing 9-9 of 9')
    await expectTabsInOrderWithSelected(page, BRANCH_TAB.label)
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
    await openAddressBookList(page, {
      organisationId: 'stub-org-list-disclosure'
    })

    await expectFilterDisclosureOpensAndCloses(page)
  })

  test('describes the Search field with the hint Search by name, address or country', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: 'stub-org-list-hint' })

    await openFilterDisclosure(page)

    await expect(searchFieldOf(page)).toHaveAccessibleDescription(
      'Search by name, address or country'
    )
  })

  for (const { submitWith, how } of SUBMIT_METHODS) {
    test(`lists only the matches, with the term in the address book URL, when submitted with ${how}`, async ({
      page
    }) => {
      await openAddressBookList(page, {
        organisationId: `stub-org-list-submit-${submitWith}-paginated`
      })

      await searchAndExpectSingleMatch(page, 'farm 12', {
        submitWith,
        matchedCellText: FARM_12
      })
    })
  }

  test('lists the matches across all pages and keeps the term on the next page', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: 'stub-org-list-next-page-paginated'
    })

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
    await openAddressBookList(page, {
      organisationId: 'stub-org-list-one-page-paginated'
    })

    await searchAndExpectMatches(page, 'farm 3', {
      submitWith: 'button',
      resultsLine: TWO_ADDRESSES_LINE
    })

    await expect(paginationOf(page)).toHaveCount(0)
  })

  test('finds an address by a term inside its address line 1', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: 'stub-org-list-address-line-paginated'
    })

    await searchAndExpectSingleMatch(page, '12 stub way', {
      matchedCellText: FARM_12
    })
  })

  test('finds an address by a lower-case term inside its address line 2', async ({
    page
  }) => {
    await addValidAddressToFreshOrganisation(page, {
      organisationPrefix: 'stub-org-list-address-line-2'
    })

    await searchAndExpectSingleMatch(page, validAddress.addressLine2.toLowerCase(), {
      matchedCellText: validAddress.name
    })
  })

  test('finds an address by part of its country name', async ({ page }) => {
    await addValidAddressToFreshOrganisation(page, {
      organisationPrefix: 'stub-org-list-country',
      overrides: { name: 'Paris Depot', countryCode: 'FR' }
    })

    await searchAndExpectSingleMatch(page, 'fran', {
      matchedCellText: 'France'
    })
  })

  test('leaves the list as it is while text is typed and not yet submitted', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: 'stub-org-list-typing-paginated'
    })
    await openFilterDisclosure(page)

    await searchFieldOf(page).fill('farm 12')

    await expect(page).toHaveURL(addressBookPath())
    await expect(resultsLineOf(page)).toHaveText(FIRST_PAGE_LINE)
    await expect(page.getByRole('row')).toHaveCount(9)
  })

  test('Clear search after a search returns to the whole selected tab with an empty Search field', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: 'stub-org-list-clear-search'
    })
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
    await openAddressBookList(page, {
      organisationId: 'stub-org-list-axe-disclosure'
    })
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
    await openAddressBookList(page, {
      organisationId: 'stub-org-list-no-js-disclosure'
    })

    await expectFilterDisclosureOpensAndCloses(page)
  })

  for (const { submitWith, how } of SUBMIT_METHODS) {
    test(`lists only the matches, with the term in the address book URL, when submitted with ${how} and JavaScript is off`, async ({
      page
    }) => {
      await openAddressBookList(page, {
        organisationId: `stub-org-list-no-js-submit-${submitWith}-paginated`
      })

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
        chosenOption: CONSIGNOR_ROLE,
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
      chosenOption: CONSIGNEE_ROLE,
      resultsLine: ONE_MATCH_LINE
    })

    await expectNamesListed(page, [TYPED_SEED.consigneeAndDestination.name])
  })

  test('counts and pages the matches holding the Type past one page, and the next page keeps the tab, the search and the Type', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: rolesPagedOrganisation('type-pages')
    })

    await searchAndExpectMatches(page, 'brook', {
      submitWith: 'button',
      chosenOption: CONSIGNOR_ROLE,
      resultsLine: 'Showing 1-8 of 9'
    })
    await expect(paginationOf(page)).toBeVisible()
    const nextPageLink = paginationOf(page).getByRole('link', {
      name: 'Next page'
    })
    const nextPageQuery = new URLSearchParams({
      addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
      q: 'brook',
      role: CONSIGNOR_ROLE.value,
      page: '2'
    })
    await expect(nextPageLink).toHaveAttribute(
      'href',
      `${addressBookPath()}?${nextPageQuery}`
    )

    await nextPageLink.click()

    await expect(resultsLineOf(page)).toHaveText('Showing 9-9 of 9')
    await openFilterDisclosure(page)
    await expectTypeChosen(page, CONSIGNOR_ROLE.value)
  })

  test('lists the addresses holding the Type that lie beyond the first page of the tab, counted and without pagination', async ({
    page
  }) => {
    await openAddressBookList(page, {
      organisationId: rolesPagedOrganisation('type-beyond-first-page')
    })
    await expect(resultsLineOf(page)).toHaveText('Showing 1-8 of 22')
    await expectNamesListed(page, numberedNames('Stub Hill Pasture', 8))

    await searchAndExpectMatches(page, 'hill', {
      submitWith: 'button',
      chosenOption: CONSIGNOR_ROLE,
      resultsLine: TWO_ADDRESSES_LINE
    })

    await expectNamesListed(page, numberedNames('Stub Hill Yard', 2))
    await expect(paginationOf(page)).toHaveCount(0)
  })

  test('requests no page and leaves the URL and the whole tab listed when a Type is chosen and not submitted', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_TYPED })
    await openFilterDisclosure(page)
    const pagesRequested = []
    page.on('request', (request) => {
      if (request.isNavigationRequest()) {
        pagesRequested.push(request.url())
      }
    })

    await typeSelectOf(page).selectOption({ label: CONSIGNOR_ROLE.label })

    await expect(page).toHaveURL(addressBookPath())
    await expect(resultsLineOf(page)).toHaveText(TWO_ADDRESSES_LINE)
    await expectNamesListed(page, ORIGIN_TAB.names)
    expect(pagesRequested).toEqual([])
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
      chosenOption: IMPORTER_ROLE,
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

  test('finds an address holding the Branch address role by searching the Branch tab for branch address, with Branch as its Type', async ({
    page
  }) => {
    await addValidAddressToFreshOrganisation(page, {
      organisationPrefix: 'stub-org-list-branch-option-label',
      addressType: ADDRESS_TYPES.BRANCH,
      emptyBook: true
    })

    await searchAndExpectSingleMatch(page, 'branch address', {
      addressType: ADDRESS_TYPES.BRANCH,
      matchedCellText: validAddress.name
    })
    await expect(typeCellOf(page, validAddress.name)).toHaveText(
      copy.list.roles.BRANCH_ADDRESS.columnLabel
    )
  })

  test('has no serious or critical axe violations with a Type chosen and the disclosure open', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: ORG_TYPED })
    await searchAndExpectQuery(page, '', {
      submitWith: 'button',
      chosenOption: CONSIGNOR_ROLE
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
      chosenOption: CONSIGNOR_ROLE,
      resultsLine: ONE_MATCH_LINE
    })

    await expectNamesListed(page, [TYPED_SEED.originAndConsignor.name])
  })
})

const COMMERCIAL_TYPE = {
  label: copy.list.transporterTypes.COMMERCIAL,
  value: 'COMMERCIAL'
}

test.describe('Transporter tab', () => {
  test('lists the organisation transporters under Name, Address, Approval number and Type, each Address cell ending in the country', async ({
    page
  }) => {
    const organisationId = `stub-org-list-transporters-${crypto.randomUUID()}`
    await addPrivateAndCommercialTransporters(page, organisationId)

    const table = page.getByRole('table')
    await expect(table.getByRole('columnheader')).toHaveText(
      TRANSPORTER_TABLE_HEADINGS
    )
    await expect(
      transporterAddressCellOf(page, validPrivateTransporter.name)
    ).toHaveText(/United Kingdom$/, { useInnerText: true })
    await expect(
      transporterAddressCellOf(page, validCommercialTransporter.name)
    ).toHaveText(/Northern Ireland$/, { useInnerText: true })
  })
})

test.describe('Transporter tab type filter', () => {
  for (const { submitWith, how } of SUBMIT_METHODS) {
    test(`lists only the commercial transporter, keeps the tab and shows the type chosen, when submitted with ${how}`, async ({
      page
    }) => {
      const organisationId = `stub-org-list-transporter-type-${submitWith}-${crypto.randomUUID()}`
      await addPrivateAndCommercialTransporters(page, organisationId)

      await searchAndExpectMatches(page, '', {
        submitWith,
        addressType: ADDRESS_TYPES.TRANSPORTER,
        chosenOption: COMMERCIAL_TYPE,
        resultsLine: ONE_MATCH_LINE
      })

      await expectNamesListed(page, [validCommercialTransporter.name])
      await expectTabsInOrderWithSelected(page, 'Transporter')
      await openFilterDisclosure(page)
      await expectTypeChosen(page, COMMERCIAL_TYPE.value)
    })
  }

  test('has no serious or critical axe violations with a Type chosen and the disclosure open', async ({
    page
  }) => {
    const organisationId = `stub-org-list-transporter-type-axe-${crypto.randomUUID()}`
    await addPrivateAndCommercialTransporters(page, organisationId)

    await searchAndExpectQuery(page, '', {
      submitWith: 'button',
      addressType: ADDRESS_TYPES.TRANSPORTER,
      chosenOption: COMMERCIAL_TYPE
    })
    await openFilterDisclosure(page)

    await expectNoSeriousOrCriticalViolations(
      page,
      'Address book Transporter tab with a Type chosen and filter open'
    )
  })
})

test.describe('Transporter tab type filter without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('lists only the commercial transporter when submitted with the Search button', async ({
    page
  }) => {
    const organisationId = `stub-org-list-transporter-type-no-js-${crypto.randomUUID()}`
    await addPrivateAndCommercialTransporters(page, organisationId)

    await searchAndExpectMatches(page, '', {
      submitWith: 'button',
      addressType: ADDRESS_TYPES.TRANSPORTER,
      chosenOption: COMMERCIAL_TYPE,
      resultsLine: ONE_MATCH_LINE
    })

    await expectNamesListed(page, [validCommercialTransporter.name])
  })
})

test.describe('empty book', () => {
  test('shows Showing 0 of 0 and the table headings with no rows', async ({
    page
  }) => {
    await openAddressBookList(page, { organisationId: 'stub-org-list-empty' })

    await expectEmptyAddressBookList(page)
  })
})
