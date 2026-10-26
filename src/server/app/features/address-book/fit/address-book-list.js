import { expect } from '@playwright/test'

export const expectAddressBookList = async (page) => {
  await expect(page).toHaveURL(/\/address-book$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Address book' })
  ).toBeVisible()
  await expect(page.getByText('Page not found')).toHaveCount(0)
}

export const expectEmptyAddressBookList = async (page) => {
  await expect(page.getByText('Showing 0 of 0')).toBeVisible()
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
