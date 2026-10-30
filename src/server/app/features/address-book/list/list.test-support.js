import { load } from 'cheerio'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressesApiPath,
  COUNTRIES,
  getPage,
  STORED_ADDRESS
} from '../../../../common/test-helpers/address-book-requests.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import {
  textOf,
  textsOf
} from '../../../../common/test-helpers/rendered-text.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import { LIST_PAGE_SIZE } from './list.controller.js'

export const NO_RESULTS_LINE = 'Showing 0 of 0'
export const TABLE_HEADINGS = ['Name', 'Address', 'Country', 'Action']

export const highlandAddress = {
  id: '1',
  name: STORED_ADDRESS.name,
  addressLine1: STORED_ADDRESS.addressLine1,
  townOrCity: STORED_ADDRESS.townOrCity,
  postcode: STORED_ADDRESS.postcode,
  countryCode: STORED_ADDRESS.countryCode
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

export const contentOf = ($) => $('.govuk-grid-column-full')

export const tagNamesOf = (elements) =>
  elements.map((_, element) => element.tagName).get()

export const resultsLineOf = ($) =>
  textOf($, '[data-testid="address-book-results-label"]')

export const tableHeadingsOf = ($) => textsOf($, 'thead th')

export const bodyRowCountOf = ($) => $('tbody tr').length

export const rowCellsOf = ($, rowIndex) =>
  $('tbody tr').eq(rowIndex).children('td')

export const startServerWithPageReader = () => {
  const server = startRealModeServerServingCountries(COUNTRIES)
  return async (url, sessionId) => {
    const { result: html, statusCode } = await getPage(server(), url, sessionId)
    return { $: load(html), html, statusCode }
  }
}

const interceptListRequest = (query) =>
  addressBookApi()
    .get(addressesApiPath())
    .query({ pageSize: String(LIST_PAGE_SIZE), ...query })

export const stubAddressPage = (query, addressPage) =>
  interceptListRequest(query).reply(statusCodes.ok, {
    ...addressPage,
    pageSize: LIST_PAGE_SIZE
  })

export const stubAddressBookUnavailable = () =>
  interceptListRequest({ page: '1' }).reply(statusCodes.serviceUnavailable, {
    title: 'Service Unavailable'
  })
