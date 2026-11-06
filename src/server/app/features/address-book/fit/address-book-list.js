import { expect } from '@playwright/test'

import { DEFAULT_ADDRESS_BOOK_TAB } from '../address-book-tabs.js'
import { addressBookPath } from '../../../shared/paths.js'
import { signInAndOpen } from '../../../../../../fit/sign-in.js'

import { NO_RESULTS_LINE, TABLE_HEADINGS } from './address-book-list-text.js'

export { NO_RESULTS_LINE, TABLE_HEADINGS }

export const UNKNOWN_ADDRESS_TYPE = 'TRANSPORTER'
export const ONE_MATCH_LINE = 'Showing 1-1 of 1'

export const typeCellOf = (page, name) =>
  page
    .getByRole('row', { name: new RegExp(name) })
    .getByRole('cell')
    .nth(1)

export const openAddressBookList = async (
  page,
  { organisationId, pageNumber, addressType }
) => {
  const params = new URLSearchParams()
  if (addressType !== undefined) {
    params.set('addressType', addressType)
  }
  if (pageNumber !== undefined) {
    params.set('page', String(pageNumber))
  }
  const query = params.size ? `?${params}` : ''
  await signInAndOpen(page, organisationId, `${addressBookPath()}${query}`)
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

const submitSearch = async (page, term, { submitWith, role }) => {
  await openFilterDisclosure(page)
  const searchField = searchFieldOf(page)
  await searchField.fill(term)
  if (role) {
    await typeSelectOf(page).selectOption({ label: role.label })
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
  { submitWith, addressType = DEFAULT_ADDRESS_BOOK_TAB.addressType, role }
) => {
  await submitSearch(page, term, { submitWith, role })
  const submittedQuery = new URLSearchParams({
    addressType,
    q: term,
    role: role?.value ?? ''
  })
  await expect(page).toHaveURL(`${addressBookPath()}?${submittedQuery}`)
}

export const searchAndExpectMatches = async (
  page,
  term,
  { submitWith, resultsLine, addressType, role }
) => {
  await searchAndExpectQuery(page, term, { submitWith, addressType, role })
  await expect(resultsLineOf(page)).toHaveText(resultsLine)
}

export const searchAndExpectSingleMatch = async (
  page,
  term,
  { submitWith = 'button', matchedCellText, addressType, role }
) => {
  await searchAndExpectMatches(page, term, {
    submitWith,
    resultsLine: ONE_MATCH_LINE,
    addressType,
    role
  })
  await expect(
    page.getByRole('cell', { name: matchedCellText, exact: true })
  ).toBeVisible()
}
