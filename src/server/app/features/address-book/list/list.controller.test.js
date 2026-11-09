import { describe, expect, test } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressTypeStartPath,
  addressBookPath,
  pageOf
} from '../../../../common/test-helpers/address-book-requests.js'
import {
  recordModuleLoggerError,
  recordModuleLoggerInfo
} from '../../../../common/test-helpers/module-logger-lines.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import { DEFAULT_ADDRESS_BOOK_TAB } from '../address-book-tabs.js'
import { textOf } from '../../../../common/test-helpers/rendered-text.js'
import {
  TABLE_HEADINGS,
  bodyRowCountOf,
  contentOf,
  fullAddress,
  greenFarmAddress,
  highlandAddress,
  parisDepotAddress,
  highlandTransporter,
  resultsLineOf,
  rowCellsOf,
  startServerWithPageReader,
  stubAddressBookUnavailable,
  stubAddressPage,
  stubTransporterPage,
  tableHeadingsOf
} from './list.test-support.js'

const PAST_LAST_PAGE_MESSAGE =
  'Address book page is past the last page, serving the last page'
const LOAD_FAILED_MESSAGE = 'Failed to load address book'

describe('#addressBookListController', () => {
  const readPage = startServerWithPageReader()
  const { entriesWith: infoLogs } = recordModuleLoggerInfo()

  test("renders the results count, column headings, and each address's View link and country label", async () => {
    stubAddressPage({ page: '1' }, pageOf([highlandAddress, parisDepotAddress]))

    const { $, statusCode } = await readPage(
      addressBookPath(),
      'list-with-addresses'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(contentOf($).children('h1').text()).toBe('Address book')
    expect(resultsLineOf($)).toBe('Showing 1-2 of 2')
    expect(tableHeadingsOf($)).toEqual(TABLE_HEADINGS)
    expect(textOf($, rowCellsOf($, 0).eq(3))).toBe('United Kingdom')
    expect(rowCellsOf($, 0).eq(4).html().trim()).toBe(
      '<a class="govuk-link" href="/address-book/1">View<span class="govuk-visually-hidden"> Highland Livestock Ltd</span></a>'
    )
    expect(textOf($, rowCellsOf($, 1).eq(3))).toBe('France')
    expect(rowCellsOf($, 1).eq(4).html().trim()).toBe(
      '<a class="govuk-link" href="/address-book/2">View<span class="govuk-visually-hidden"> Paris Depot</span></a>'
    )
  })

  test('shows the page 2 results range, links pages 1 to 4 and marks page 2 current when the address book spans four pages', async () => {
    stubAddressPage(
      { page: '2' },
      pageOf(
        [
          {
            id: '1',
            name: 'Farm',
            addressLine1: '1 Road',
            countryCode: 'GB',
            roles: []
          }
        ],
        { page: 2, totalItems: 30, totalPages: 4 }
      )
    )

    const { $, statusCode } = await readPage(
      `${addressBookPath()}?page=2`,
      'list-page-2'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(resultsLineOf($)).toBe('Showing 9-16 of 30')
    expect(
      $('.govuk-pagination__item a')
        .map((_, link) => $(link).attr('href'))
        .get()
    ).toEqual([
      `${addressBookPath()}?addressType=ORIGIN_OR_CONSIGNOR`,
      `${addressBookPath()}?addressType=ORIGIN_OR_CONSIGNOR&page=2`,
      `${addressBookPath()}?addressType=ORIGIN_OR_CONSIGNOR&page=3`,
      `${addressBookPath()}?addressType=ORIGIN_OR_CONSIGNOR&page=4`
    ])
    expect(textOf($, '.govuk-pagination__item--current')).toBe('2')
  })

  test.each(['0', 'abc'])(
    'asks for page 1 when the page number is %s',
    async (queryPage) => {
      const scope = stubAddressPage({ page: '1' }, pageOf([highlandAddress]))

      const { statusCode } = await readPage(
        `${addressBookPath()}?page=${queryPage}`,
        'list-unusable-page'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(scope.isDone()).toBe(true)
    }
  )

  test('shows the last page, asked for a second time, when the page number is past the last page, and logs the fallback once', async () => {
    const pastLastPage = stubAddressPage(
      { page: '99' },
      pageOf([], { page: 99, totalItems: 12, totalPages: 2 })
    )
    const lastPage = stubAddressPage(
      { page: '2' },
      pageOf([greenFarmAddress, fullAddress], {
        page: 2,
        totalItems: 12,
        totalPages: 2
      })
    )

    const { $, statusCode } = await readPage(
      `${addressBookPath()}?page=99`,
      'list-past-last-page'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(pastLastPage.isDone()).toBe(true)
    expect(lastPage.isDone()).toBe(true)
    expect(resultsLineOf($)).toBe('Showing 9-12 of 12')
    expect(bodyRowCountOf($)).toBe(2)
    expect(textOf($, '.govuk-pagination__item--current')).toBe('2')
    expect(infoLogs(PAST_LAST_PAGE_MESSAGE)).toEqual([
      {
        fields: {
          organisationId: ORGANISATION_ID,
          searchTermLength: 0,
          countryCodes: [],
          searchRoles: [],
          roles: DEFAULT_ADDRESS_BOOK_TAB.roles,
          requestedPage: 99,
          servedPage: 2
        },
        message: PAST_LAST_PAGE_MESSAGE
      }
    ])
  })

  test('shows no pagination when the matches of a search fit on one page', async () => {
    stubAddressPage(
      { page: '1', q: 'green' },
      pageOf([greenFarmAddress, fullAddress])
    )

    const { $ } = await readPage(
      `${addressBookPath()}?q=green`,
      'list-search-one-page'
    )

    expect(resultsLineOf($)).toBe('Showing 1-2 of 2')
    expect($('.govuk-pagination')).toHaveLength(0)
  })

  test('forwards the search query and the country code whose name contains it', async () => {
    const scope = stubAddressPage(
      { page: '1', q: 'fran', countryCode: 'FR' },
      pageOf([parisDepotAddress])
    )

    const { statusCode } = await readPage(
      `${addressBookPath()}?q=fran`,
      'list-search-country'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
  })

  test.each([
    ['matches', pageOf([greenFarmAddress])],
    ['no matches', pageOf([])]
  ])(
    'Should link Clear search to the whole list of the selected tab under the results line when a search has %s',
    async (_, addressPage) => {
      stubAddressPage(
        { page: '1', q: 'green', tabAddressType: ADDRESS_TYPES.BRANCH },
        addressPage
      )

      const { $ } = await readPage(
        `${addressBookPath()}?addressType=BRANCH&q=green`,
        'list-clear-search'
      )

      const clearSearch = $('[data-testid="address-book-clear-search"]')
      expect(textOf($, clearSearch)).toBe('Clear search')
      expect(clearSearch.attr('href')).toBe(
        `${addressBookPath()}?addressType=BRANCH`
      )
      expect(
        $('[data-testid="address-book-results-label"]')
          .next()
          .is(clearSearch.parent())
      ).toBe(true)
    }
  )

  test('links each page shown with the selected tab, the search term and the page number only', async () => {
    const scope = stubAddressPage(
      { page: '2', q: 'green', tabAddressType: ADDRESS_TYPES.BRANCH },
      pageOf([greenFarmAddress], {
        page: 2,
        totalItems: 30,
        totalPages: 4
      })
    )

    const { $, statusCode } = await readPage(
      `${addressBookPath()}?addressType=BRANCH&q=green&countryCode=GB&page=2`,
      'list-search-page-2'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(
      $('.govuk-pagination__item a')
        .map((_, link) => $(link).attr('href'))
        .get()
    ).toEqual([
      `${addressBookPath()}?addressType=BRANCH&q=green`,
      `${addressBookPath()}?addressType=BRANCH&q=green&page=2`,
      `${addressBookPath()}?addressType=BRANCH&q=green&page=3`,
      `${addressBookPath()}?addressType=BRANCH&q=green&page=4`
    ])
  })
})

describe('#addressBookListController — search term privacy', () => {
  const readPage = startServerWithPageReader()
  const { entriesWith: infoLogs } = recordModuleLoggerInfo()

  test('logs no trace of a typed search term when falling back past the last page', async () => {
    const SEARCH_TERM = 'confidential-trader-name'
    stubAddressPage(
      { page: '99', q: SEARCH_TERM },
      pageOf([], { page: 99, totalItems: 1, totalPages: 1 })
    )
    stubAddressPage(
      { page: '1', q: SEARCH_TERM },
      pageOf([highlandAddress], { page: 1, totalItems: 1, totalPages: 1 })
    )

    const { statusCode } = await readPage(
      `${addressBookPath()}?page=99&q=${SEARCH_TERM}`,
      'list-search-past-last-page'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const [logged] = infoLogs(PAST_LAST_PAGE_MESSAGE)
    expect(JSON.stringify(logged.fields)).not.toContain(SEARCH_TERM)
    expect(logged.fields.searchTermLength).toBe(SEARCH_TERM.length)
  })
})

describe('#addressBookListController — the Transporter tab', () => {
  const readPage = startServerWithPageReader()
  const { entriesWith: infoLogs } = recordModuleLoggerInfo()

  const stubTransporterPastLastPage = (query = {}) => ({
    pastLastPage: stubTransporterPage(
      { page: '99', ...query },
      pageOf([], { page: 99, totalItems: 1, totalPages: 1 })
    ),
    lastPage: stubTransporterPage(
      { page: '1', ...query },
      pageOf([highlandTransporter], { page: 1, totalItems: 1, totalPages: 1 })
    )
  })

  const expectTransporterPastLastPageLogged = (types) =>
    expect(infoLogs(PAST_LAST_PAGE_MESSAGE)).toEqual([
      {
        fields: {
          organisationId: ORGANISATION_ID,
          searchTermLength: 0,
          countryCodes: [],
          searchTypes: [],
          types,
          requestedPage: 99,
          servedPage: 1
        },
        message: PAST_LAST_PAGE_MESSAGE
      }
    ])

  test("renders a transporter's View link at its own transporter URL, carrying the Transporter tab as its return", async () => {
    stubTransporterPage(
      { page: '1' },
      pageOf([highlandTransporter], { page: 1, totalItems: 1, totalPages: 1 })
    )

    const { $, statusCode } = await readPage(
      `${addressBookPath()}?addressType=${ADDRESS_TYPES.TRANSPORTER}`,
      'list-transporter-view-link'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const returnQuery = new URLSearchParams({
      return: `${addressBookPath()}?addressType=${ADDRESS_TYPES.TRANSPORTER}`
    }).toString()
    expect(rowCellsOf($, 0).eq(4).html().trim()).toBe(
      `<a class="govuk-link" href="/address-book/transporter/1?${returnQuery}">View<span class="govuk-visually-hidden"> ${highlandTransporter.name}</span></a>`
    )
  })

  test('shows the last page of transporters, asked for a second time, when the page number is past the last page, and logs the fallback once', async () => {
    const { pastLastPage, lastPage } = stubTransporterPastLastPage()

    const { statusCode } = await readPage(
      `${addressBookPath()}?addressType=${ADDRESS_TYPES.TRANSPORTER}&page=99`,
      'list-transporter-past-last-page'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(pastLastPage.isDone()).toBe(true)
    expect(lastPage.isDone()).toBe(true)
    expectTransporterPastLastPageLogged([])
  })

  test('names the chosen transporter type among the past-last-page filters it already carries', async () => {
    const { pastLastPage, lastPage } = stubTransporterPastLastPage({
      type: 'COMMERCIAL'
    })

    const { statusCode } = await readPage(
      `${addressBookPath()}?addressType=${ADDRESS_TYPES.TRANSPORTER}&type=COMMERCIAL&page=99`,
      'list-transporter-past-last-page-type'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(pastLastPage.isDone()).toBe(true)
    expect(lastPage.isDone()).toBe(true)
    expectTransporterPastLastPageLogged(['COMMERCIAL'])
  })
})

describe('#addressBookListController when the address book cannot be reached', () => {
  const readPage = startServerWithPageReader()
  const { entriesWith: errorLogs } = recordModuleLoggerError()

  test('returns 500 with the heading, intro, Add button and filter but no results line or table, and logs the failure once', async () => {
    stubAddressBookUnavailable()

    const { $, html, statusCode } = await readPage(
      addressBookPath(),
      'list-500'
    )

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(html).toContain('govuk-notification-banner')
    expect(html).toContain(
      'Sorry, there is a problem with the service. Try again in a few minutes.'
    )
    expect(html).not.toContain('govuk-error-summary')
    expect(contentOf($).children('h1').text()).toBe('Address book')
    expect(contentOf($).children('p.govuk-body-l').text()).toBe(
      'Manage your addresses for use across all your import notifications'
    )
    expect(contentOf($).children('p').next('div').find('a').attr('href')).toBe(
      addressTypeStartPath()
    )
    expect(contentOf($).children('form').find('input[name="q"]')).toHaveLength(
      1
    )
    expect(resultsLineOf($)).toBe('')
    expect(tableHeadingsOf($)).toEqual([])
    expect(errorLogs(LOAD_FAILED_MESSAGE)).toEqual([
      {
        fields: {
          err: expect.any(Error),
          organisationId: ORGANISATION_ID,
          addressType: DEFAULT_ADDRESS_BOOK_TAB.addressType
        },
        message: LOAD_FAILED_MESSAGE
      }
    ])
  })
})
