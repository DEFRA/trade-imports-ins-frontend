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

const addressTypesNavOf = (page) =>
  page.getByRole('navigation', { name: 'Address types' })

export const subNavigationLinkLocatorsOf = (page) =>
  addressTypesNavOf(page).getByRole('link')

export const selectedTabOf = (page) =>
  addressTypesNavOf(page).locator('[aria-current="page"]')

export const panelHeadingLocatorOf = (page) =>
  page.getByRole('main').getByRole('heading', { level: 2 })

export const namesListedBy = (page) =>
  page.getByRole('row').locator('td:first-child').allInnerTexts()

export const expectNamesListed = async (page, names) => {
  expect(await namesListedBy(page)).toEqual(
    names.map((name) => name.replace(' ', '\n'))
  )
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
  addressTypesNavOf(page)
    .getByRole('link', { name: label, exact: true })
    .click()

const submitSearch = async (page, term, { submitWith, type }) => {
  await openFilterDisclosure(page)
  const searchField = searchFieldOf(page)
  await searchField.fill(term)
  if (type) {
    await typeSelectOf(page).selectOption({ label: type.label })
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
  { submitWith, addressType = DEFAULT_ADDRESS_BOOK_TAB.addressType, type }
) => {
  await submitSearch(page, term, { submitWith, type })
  const submittedQuery = new URLSearchParams({
    addressType,
    q: term,
    use: type?.use ?? ''
  })
  await expect(page).toHaveURL(`${addressBookPath()}?${submittedQuery}`)
}

export const searchAndExpectMatches = async (
  page,
  term,
  { submitWith, resultsLine, addressType, type }
) => {
  await searchAndExpectQuery(page, term, { submitWith, addressType, type })
  await expect(resultsLineOf(page)).toHaveText(resultsLine)
}

export const searchAndExpectSingleMatch = async (
  page,
  term,
  { submitWith = 'button', matchedCellText, addressType, type }
) => {
  await searchAndExpectMatches(page, term, {
    submitWith,
    resultsLine: 'Showing 1-1 of 1',
    addressType,
    type
  })
  await expect(
    page.getByRole('cell', { name: matchedCellText, exact: true })
  ).toBeVisible()
}
