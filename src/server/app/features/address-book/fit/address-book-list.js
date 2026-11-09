import { expect } from '@playwright/test'

import { DEFAULT_ADDRESS_BOOK_TAB, resolveTab } from '../address-book-tabs.js'
import { addressBookPath } from '../../../shared/paths.js'
import { signInAndOpen } from '../../../../../../fit/sign-in.js'

import {
  NO_RESULTS_LINE,
  TABLE_HEADINGS,
  TRANSPORTER_TABLE_HEADINGS
} from './address-book-list-text.js'

export { NO_RESULTS_LINE, TABLE_HEADINGS, TRANSPORTER_TABLE_HEADINGS }

export const UNSUPPORTED_ADDRESS_TYPE = 'UNSUPPORTED_ADDRESS_TYPE'
export const ONE_MATCH_LINE = 'Showing 1-1 of 1'

const TYPE_CELL_INDEX = 1
const TRANSPORTER_APPROVAL_NUMBER_CELL_INDEX = 2
const TRANSPORTER_TYPE_CELL_INDEX = 3
const TRANSPORTER_ADDRESS_CELL_INDEX = 1

const rowCellOf = (page, name, index) =>
  page
    .getByRole('row', { name: new RegExp(name) })
    .getByRole('cell')
    .nth(index)

export const typeCellOf = (page, name) => rowCellOf(page, name, TYPE_CELL_INDEX)

export const transporterApprovalNumberCellOf = (page, name) =>
  rowCellOf(page, name, TRANSPORTER_APPROVAL_NUMBER_CELL_INDEX)

export const transporterTypeCellOf = (page, name) =>
  rowCellOf(page, name, TRANSPORTER_TYPE_CELL_INDEX)

export const transporterAddressCellOf = (page, name) =>
  rowCellOf(page, name, TRANSPORTER_ADDRESS_CELL_INDEX)

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
  await expect(page.getByRole('columnheader')).toHaveText(TABLE_HEADINGS)
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

const submitSearch = async (page, term, { submitWith, chosenOption }) => {
  await openFilterDisclosure(page)
  const searchField = searchFieldOf(page)
  await searchField.fill(term)
  if (chosenOption) {
    await typeSelectOf(page).selectOption({ label: chosenOption.label })
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
  {
    submitWith,
    addressType = DEFAULT_ADDRESS_BOOK_TAB.addressType,
    chosenOption
  }
) => {
  await submitSearch(page, term, { submitWith, chosenOption })
  const { param } = resolveTab(addressType).typeFilter
  const submittedQuery = new URLSearchParams({
    addressType,
    q: term,
    [param]: chosenOption?.value ?? ''
  })
  await expect(page).toHaveURL(`${addressBookPath()}?${submittedQuery}`)
}

export const searchAndExpectMatches = async (
  page,
  term,
  { submitWith, resultsLine, addressType, chosenOption }
) => {
  await searchAndExpectQuery(page, term, {
    submitWith,
    addressType,
    chosenOption
  })
  await expect(resultsLineOf(page)).toHaveText(resultsLine)
}

export const searchAndExpectSingleMatch = async (
  page,
  term,
  { submitWith = 'button', matchedCellText, addressType, chosenOption }
) => {
  await searchAndExpectMatches(page, term, {
    submitWith,
    resultsLine: ONE_MATCH_LINE,
    addressType,
    chosenOption
  })
  await expect(
    page.getByRole('cell', { name: matchedCellText, exact: true })
  ).toBeVisible()
}
