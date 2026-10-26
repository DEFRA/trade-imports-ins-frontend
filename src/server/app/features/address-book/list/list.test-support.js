import { load } from 'cheerio'

import { getPage } from '../../../../common/test-helpers/address-book-requests.js'

const ORGANISATION_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'

export const ADDRESSES_PATH = `/organisation/${ORGANISATION_ID}/addresses`
export const LIST_URL = '/address-book'
export const NO_RESULTS_LINE = 'Showing 0 of 0'
export const TABLE_HEADINGS = ['Name', 'Address', 'Country', 'Action']

export const countries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

export const highlandAddress = {
  id: '1',
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB'
}

export const parisDepotAddress = {
  id: '2',
  name: 'Paris Depot',
  addressLine1: '1 Rue de Rivoli',
  townOrCity: 'Paris',
  postcode: '75001',
  countryCode: 'FR'
}

export const greenFarmAddress = {
  id: '1',
  name: 'Green Farm',
  addressLine1: '1 Road',
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB'
}

export const fullAddress = {
  id: '2',
  name: 'Drover',
  addressLine1: "14 Drover's Way",
  addressLine2: 'Unit 3',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB'
}

export const pageOf = (items, overrides = {}) => ({
  items,
  page: 1,
  pageSize: 25,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
  ...overrides
})

export const contentOf = ($) => $('.govuk-grid-column-full')

export const tagNamesOf = (elements) =>
  elements.map((_, element) => element.tagName).get()

export const resultsLineOf = ($) =>
  $('[data-testid="address-book-results-label"]').text().trim()

export const tableHeadOf = ($) =>
  $('thead th')
    .map((_, heading) => $(heading).text().trim())
    .get()

export const bodyRowCountOf = ($) => $('tbody tr').length

export const rowCellsOf = ($, rowIndex) =>
  $('tbody tr').eq(rowIndex).children('td')

export const listPageOf = async (server, url, sessionId) => {
  const { result: html, statusCode } = await getPage(server, url, sessionId)
  return { $: load(html), html, statusCode }
}
