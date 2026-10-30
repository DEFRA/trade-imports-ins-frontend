import { describe, expect, test, vi } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  ADD_ADDRESS_PATH,
  ADDRESS_BOOK_PATH,
  pageOf
} from '../../../../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { textOf } from '../../../../common/test-helpers/rendered-text.js'
import {
  TABLE_HEADINGS,
  bodyRowCountOf,
  contentOf,
  fullAddress,
  greenFarmAddress,
  highlandAddress,
  parisDepotAddress,
  resultsLineOf,
  rowCellsOf,
  startServerWithPageReader,
  stubAddressBookUnavailable,
  stubAddressPage,
  tableHeadingsOf,
  tagNamesOf
} from './list.test-support.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#addressBookListController', () => {
  const readPage = startServerWithPageReader()

  test("renders the results count, column headings, and each address's View link and country label", async () => {
    stubAddressPage({ page: '1' }, pageOf([highlandAddress, parisDepotAddress]))

    const { $, statusCode } = await readPage(
      ADDRESS_BOOK_PATH,
      'list-with-addresses'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(contentOf($).children('h1').text()).toBe('Address book')
    expect(resultsLineOf($)).toBe('Showing 1-2 of 2')
    expect(tableHeadingsOf($)).toEqual(TABLE_HEADINGS)
    expect(textOf($, rowCellsOf($, 0).eq(2))).toBe('United Kingdom')
    expect(rowCellsOf($, 0).eq(3).html().trim()).toBe(
      '<a class="govuk-link" href="/address-book/1">View<span class="govuk-visually-hidden"> Highland Livestock Ltd</span></a>'
    )
    expect(textOf($, rowCellsOf($, 1).eq(2))).toBe('France')
    expect(rowCellsOf($, 1).eq(3).html().trim()).toBe(
      '<a class="govuk-link" href="/address-book/2">View<span class="govuk-visually-hidden"> Paris Depot</span></a>'
    )
  })

  test('renders numbered pagination when more than one page', async () => {
    stubAddressPage(
      { page: '2' },
      pageOf(
        [{ id: '1', name: 'Farm', addressLine1: '1 Road', countryCode: 'GB' }],
        { page: 2, totalItems: 30, totalPages: 4 }
      )
    )

    const { html, statusCode } = await readPage(
      `${ADDRESS_BOOK_PATH}?page=2`,
      'list-page-2'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(html).toContain('govuk-pagination')
    expect(html).toContain('Showing 9-16 of 30')
    expect(html).toContain('?page=2')
  })

  test.each(['0', 'abc'])(
    'asks for page 1 when the page number is %s',
    async (queryPage) => {
      const scope = stubAddressPage({ page: '1' }, pageOf([highlandAddress]))

      const { statusCode } = await readPage(
        `${ADDRESS_BOOK_PATH}?page=${queryPage}`,
        'list-unusable-page'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(scope.isDone()).toBe(true)
    }
  )

  test('shows the last page, asked for a second time, when the page number is past the last page', async () => {
    const stalePage = stubAddressPage(
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
      `${ADDRESS_BOOK_PATH}?page=99`,
      'list-stale-page'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(stalePage.isDone()).toBe(true)
    expect(lastPage.isDone()).toBe(true)
    expect(resultsLineOf($)).toBe('Showing 9-12 of 12')
    expect(bodyRowCountOf($)).toBe(2)
    expect(textOf($, '.govuk-pagination__item--current')).toBe('2')
  })

  test('shows no pagination when the matches of a search fit on one page', async () => {
    stubAddressPage(
      { page: '1', q: 'green' },
      pageOf([greenFarmAddress, fullAddress])
    )

    const { $ } = await readPage(
      `${ADDRESS_BOOK_PATH}?q=green`,
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

    const { $, statusCode } = await readPage(
      `${ADDRESS_BOOK_PATH}?q=fran`,
      'list-search-country'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(rowCellsOf($, 0).eq(0).html()).toBe('Paris<br> Depot')
    expect(textOf($, rowCellsOf($, 0).eq(2))).toBe('France')
    expect($('input[name="q"]').val()).toBe('fran')
  })

  test.each([
    ['matches', pageOf([greenFarmAddress])],
    ['no matches', pageOf([])]
  ])(
    'Should link Clear search to the whole address book under the results line when a search has %s',
    async (_, addressPage) => {
      stubAddressPage({ page: '1', q: 'green' }, addressPage)

      const { $ } = await readPage(
        `${ADDRESS_BOOK_PATH}?q=green`,
        'list-clear-search'
      )

      const clearSearch = $('[data-testid="address-book-clear-search"]')
      expect(textOf($, clearSearch)).toBe('Clear search')
      expect(clearSearch.attr('href')).toBe(ADDRESS_BOOK_PATH)
      expect(
        $('[data-testid="address-book-results-label"]')
          .next()
          .is(clearSearch.parent())
      ).toBe(true)
    }
  )

  test('links every page with the search term and the page number only', async () => {
    const scope = stubAddressPage(
      { page: '2', q: 'green' },
      pageOf([greenFarmAddress], {
        page: 2,
        totalItems: 30,
        totalPages: 4
      })
    )

    const { $, statusCode } = await readPage(
      `${ADDRESS_BOOK_PATH}?q=green&countryCode=GB&page=2`,
      'list-search-page-2'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(
      $('.govuk-pagination__item a')
        .map((_, link) => $(link).attr('href'))
        .get()
    ).toEqual([
      `${ADDRESS_BOOK_PATH}?q=green`,
      `${ADDRESS_BOOK_PATH}?q=green&page=2`,
      `${ADDRESS_BOOK_PATH}?q=green&page=3`,
      `${ADDRESS_BOOK_PATH}?q=green&page=4`
    ])
  })

  test('returns 500 when the address book cannot be reached, with the heading, intro, Add button and filter but no results line or table', async () => {
    stubAddressBookUnavailable()

    const { $, html, statusCode } = await readPage(
      ADDRESS_BOOK_PATH,
      'list-500'
    )

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(html).toContain('govuk-notification-banner')
    expect(html).toContain(
      'Sorry, there is a problem with the service. Try again in a few minutes.'
    )
    expect(html).not.toContain('govuk-error-summary')
    expect(tagNamesOf(contentOf($).children())).toEqual([
      'div',
      'h1',
      'p',
      'div',
      'form'
    ])
    expect(contentOf($).children('h1').text()).toBe('Address book')
    expect(contentOf($).children('p.govuk-body-l').text()).toBe(
      'Manage your addresses for use across all your import notifications'
    )
    expect(contentOf($).children('p').next('div').find('a').attr('href')).toBe(
      ADD_ADDRESS_PATH
    )
    expect(contentOf($).children('form').find('input[name="q"]')).toHaveLength(
      1
    )
    expect(resultsLineOf($)).toBe('')
    expect(tableHeadingsOf($)).toEqual([])
  })
})
