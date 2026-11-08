import { load } from 'cheerio'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressesApiPath,
  COUNTRIES,
  getPage,
  STORED_ADDRESS,
  transportersApiPath
} from '../../../../common/test-helpers/address-book-requests.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import {
  textOf,
  textsOf
} from '../../../../common/test-helpers/rendered-text.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import {
  ADDRESS_TYPES,
  ROLES_BY_ADDRESS_TYPE
} from '../../../services/address-book/index.js'
import { DEFAULT_ADDRESS_BOOK_TAB } from '../address-book-tabs.js'
import { LIST_PAGE_SIZE } from './list.controller.js'

export {
  NO_RESULTS_LINE,
  TABLE_HEADINGS,
  TRANSPORTER_TABLE_HEADINGS
} from '../fit/address-book-list-text.js'

export const highlandAddress = {
  id: '1',
  name: STORED_ADDRESS.name,
  addressLine1: STORED_ADDRESS.addressLine1,
  townOrCity: STORED_ADDRESS.townOrCity,
  postcode: STORED_ADDRESS.postcode,
  countryCode: STORED_ADDRESS.countryCode,
  roles: []
}

export const parisDepotAddress = {
  id: '2',
  name: 'Paris Depot',
  addressLine1: '1 Rue de Rivoli',
  townOrCity: 'Paris',
  postcode: '75001',
  countryCode: 'FR',
  roles: []
}

export const greenFarmAddress = {
  id: '1',
  name: 'Green Farm',
  addressLine1: '1 Road',
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  roles: []
}

export const highlandTransporter = {
  id: '1',
  name: STORED_ADDRESS.name,
  addressLine1: STORED_ADDRESS.addressLine1,
  townOrCity: STORED_ADDRESS.townOrCity,
  postcode: STORED_ADDRESS.postcode,
  countryCode: STORED_ADDRESS.countryCode,
  type: 'PRIVATE'
}

export const fullAddress = {
  id: '2',
  name: 'Drover',
  addressLine1: "14 Drover's Way",
  addressLine2: 'Unit 3',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  roles: []
}

export const contentOf = ($) => $('.govuk-grid-column-full')

export const tagNamesOf = (elements) =>
  elements.map((_, element) => element.tagName).get()

export const resultsLineOf = ($) =>
  textOf($, '[data-testid="address-book-results-label"]')

export const tableHeadingsOf = ($) => textsOf($, 'thead th')

export const subNavigationOf = ($) => $('nav.moj-sub-navigation')

export const subNavigationLinksOf = ($) =>
  $('nav.moj-sub-navigation a')
    .map((_, anchor) => ({
      text: textOf($, anchor),
      href: $(anchor).attr('href'),
      current: $(anchor).attr('aria-current') ?? null
    }))
    .get()

export const typeSelectStateOf = ($) => {
  const select = $('select[name="role"], select[name="type"]')
  const options = select.find('option')
  return {
    label: textOf($, $(`label[for="${select.attr('id')}"]`)),
    optionTexts: options.map((_, option) => textOf($, option)).get(),
    emptyValueTexts: options
      .filter((_, option) => $(option).attr('value') === '')
      .map((_, option) => textOf($, option))
      .get(),
    selectedTexts: options
      .filter((_, option) => $(option).attr('selected') !== undefined)
      .map((_, option) => textOf($, option))
      .get()
  }
}

export const panelHeadingTextOf = ($) => textOf($, contentOf($).children('h2'))

export const bodyRowCountOf = ($) => $('tbody tr').length

export const rowCellsOf = ($, rowIndex) =>
  $('tbody tr').eq(rowIndex).children('td')

export const startServerWithPageReader = () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)
  return async (url, sessionId) => {
    const { result: html, statusCode } = await getPage(
      getServer(),
      url,
      sessionId
    )
    return { $: load(html), html, statusCode }
  }
}

const roleQueryValueOf = (roles) => (roles.length === 1 ? roles[0] : roles)

const interceptListRequest = ({
  tabAddressType = DEFAULT_ADDRESS_BOOK_TAB.addressType,
  role,
  ...query
}) =>
  tabAddressType === ADDRESS_TYPES.TRANSPORTER
    ? addressBookApi()
        .get(transportersApiPath())
        .query({ pageSize: String(LIST_PAGE_SIZE), ...query })
    : addressBookApi()
        .get(addressesApiPath())
        .query({
          pageSize: String(LIST_PAGE_SIZE),
          role: role ?? roleQueryValueOf(ROLES_BY_ADDRESS_TYPE[tabAddressType]),
          ...query
        })

export const stubAddressPage = (query, addressPage) =>
  interceptListRequest(query).reply(statusCodes.ok, {
    ...addressPage,
    pageSize: LIST_PAGE_SIZE
  })

export const stubAddressBookUnavailable = (query = {}) =>
  interceptListRequest({ page: '1', ...query }).reply(
    statusCodes.serviceUnavailable,
    {
      title: 'Service Unavailable'
    }
  )

export const stubTransporterPage = (query, transporterPage) =>
  interceptListRequest({
    tabAddressType: ADDRESS_TYPES.TRANSPORTER,
    ...query
  }).reply(statusCodes.ok, { ...transporterPage, pageSize: LIST_PAGE_SIZE })
