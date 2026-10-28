import { expect } from '@playwright/test'

import { signIn } from '../../../../../../fit/sign-in.js'

export const openAddressBookList = async (
  page,
  { organisationId, pageNumber }
) => {
  await signIn(page, { organisationId })
  const query = pageNumber === undefined ? '' : `?page=${pageNumber}`
  await page.goto(`/address-book${query}`)
}

export const expectAddressBookList = async (page) => {
  await expect(page).toHaveURL(/\/address-book$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Address book' })
  ).toBeVisible()
}

export const resultsLineOf = (page) =>
  page.getByTestId('address-book-results-label')

export const expectEmptyAddressBookList = async (page) => {
  await expect(resultsLineOf(page)).toHaveText('Showing 0 of 0')
  await expect(page.getByRole('columnheader')).toHaveText([
    'Name',
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

const submitSearch = async (page, term, { submitWith }) => {
  await openFilterDisclosure(page)
  const searchField = searchFieldOf(page)
  await searchField.fill(term)
  if (submitWith === 'enter') {
    await searchField.press('Enter')
  } else {
    await page.getByRole('button', { name: 'Search', exact: true }).click()
  }
}

export const searchAndExpectQuery = async (page, term, { submitWith }) => {
  await submitSearch(page, term, { submitWith })
  const submittedQuery = new URLSearchParams({ q: term })
  await expect(page).toHaveURL(`/address-book?${submittedQuery}`)
}

export const searchAndExpectMatches = async (
  page,
  term,
  { submitWith, resultsLine }
) => {
  await searchAndExpectQuery(page, term, { submitWith })
  await expect(resultsLineOf(page)).toHaveText(resultsLine)
}

export const searchAndExpectSingleMatch = async (
  page,
  term,
  { submitWith = 'button', matchName }
) => {
  await searchAndExpectMatches(page, term, {
    submitWith,
    resultsLine: 'Showing 1-1 of 1'
  })
  await expect(
    page.getByRole('cell', { name: matchName, exact: true })
  ).toBeVisible()
}
