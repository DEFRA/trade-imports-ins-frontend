import { expect } from '@playwright/test'

import { DEFAULT_ADDRESS_BOOK_TAB } from '../address-book-tabs.js'
import { addressBookPath } from '../../../shared/paths.js'
import { signIn } from '../../../../../../fit/sign-in.js'

export const UNKNOWN_ADDRESS_TYPE = 'TRANSPORTER'
export const NO_RESULTS_LINE = 'Showing 0 of 0'

export const openAddressBookList = async (
  page,
  { organisationId, pageNumber, addressType }
) => {
  await signIn(page, { organisationId })
  const params = new URLSearchParams()
  if (addressType !== undefined) {
    params.set('addressType', addressType)
  }
  if (pageNumber !== undefined) {
    params.set('page', String(pageNumber))
  }
  const query = params.size ? `?${params}` : ''
  await page.goto(`${addressBookPath()}${query}`)
}

const tabsNavOf = (page) =>
  page.getByRole('navigation', { name: 'Address types' })

export const tabLinksOf = (page) => tabsNavOf(page).getByRole('link')

export const selectedTabOf = (page) =>
  tabsNavOf(page).locator('[aria-current="page"]')

export const tabPanelHeadingOf = (page) =>
  page.getByRole('main').getByRole('heading', { level: 2 })

const nameCellsOf = (page) => page.getByRole('row').locator('td:first-child')

export const expectNamesListed = async (page, names) => {
  await expect(nameCellsOf(page)).toHaveText(names)
}

export const expectAddressBookList = async (page) => {
  await expect(page).toHaveURL(addressBookPath())
  await expect(
    page.getByRole('heading', { level: 1, name: 'Address book' })
  ).toBeVisible()
}

export const resultsLineOf = (page) =>
  page.getByTestId('address-book-results-label')

export const expectEmptyAddressBookList = async (page) => {
  await expect(resultsLineOf(page)).toHaveText(NO_RESULTS_LINE)
  await expect(page.getByRole('columnheader')).toHaveText([
    'Name',
    'Type',
    'Address',
    'Country',
    'Action'
  ])
  await expect(page.getByRole('row')).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Add a new address' })
  ).toBeVisible()
}

export const searchFieldOf = (page) =>
  page.getByRole('searchbox', { name: 'Search', exact: true })

const toggleFilterDisclosure = (page) =>
  page.getByText('Filter addresses', { exact: true }).click()

export const openFilterDisclosure = async (page) => {
  await toggleFilterDisclosure(page)
  await expect(searchFieldOf(page)).toBeVisible()
}

export const expectFilterDisclosureOpensAndCloses = async (page) => {
  await expect(searchFieldOf(page)).toBeHidden()
  await openFilterDisclosure(page)
  await toggleFilterDisclosure(page)
  await expect(searchFieldOf(page)).toBeHidden()
}

export const typeSelectOf = (page) =>
  page.getByRole('combobox', { name: 'Type', exact: true })

export const followTab = (page, label) =>
  tabsNavOf(page).getByRole('link', { name: label, exact: true }).click()

const submitSearch = async (page, term, { submitWith, use }) => {
  await openFilterDisclosure(page)
  const searchField = searchFieldOf(page)
  await searchField.fill(term)
  if (use) {
    await typeSelectOf(page).selectOption({ label: use.label })
  }
  if (submitWith === 'enter') {
    await searchField.press('Enter')
  } else {
    await page.getByRole('button', { name: 'Search', exact: true }).click()
  }
}

export const searchAndExpectQuery = async (
  page,
  term,
  { submitWith, addressType = DEFAULT_ADDRESS_BOOK_TAB.addressType, use }
) => {
  await submitSearch(page, term, { submitWith, use })
  const submittedQuery = new URLSearchParams({
    addressType,
    q: term,
    use: use?.value ?? ''
  })
  await expect(page).toHaveURL(`${addressBookPath()}?${submittedQuery}`)
}

export const searchAndExpectMatches = async (
  page,
  term,
  { submitWith, resultsLine, addressType, use }
) => {
  await searchAndExpectQuery(page, term, { submitWith, addressType, use })
  await expect(resultsLineOf(page)).toHaveText(resultsLine)
}

export const searchAndExpectSingleMatch = async (
  page,
  term,
  { submitWith = 'button', matchedCellText, addressType, use }
) => {
  await searchAndExpectMatches(page, term, {
    submitWith,
    resultsLine: 'Showing 1-1 of 1',
    addressType,
    use
  })
  await expect(
    page.getByRole('cell', { name: matchedCellText, exact: true })
  ).toBeVisible()
}
