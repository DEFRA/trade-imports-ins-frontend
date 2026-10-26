import { describe, expect, test, vi } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  ADDRESSES_PATH,
  pageOf
} from '../../../../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import {
  ADD_PATH,
  LIST_URL,
  TABLE_HEADINGS,
  contentOf,
  greenFarmAddress,
  highlandAddress,
  parisDepotAddress,
  resultsLineOf,
  rowCellsOf,
  startListPage,
  stubAddressPage,
  tableHeadingsOf,
  tagNamesOf
} from './list.test-support.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#addressBookListController', () => {
  const getList = startListPage()

  test("renders the results count, column headings, and each address's View link and country label", async () => {
    stubAddressPage({ page: '1' }, pageOf([highlandAddress, parisDepotAddress]))

    const { $, statusCode } = await getList(LIST_URL, 'list-with-addresses')

    expect(statusCode).toBe(statusCodes.ok)
    expect(contentOf($).children('h1').text()).toBe('Address book')
    expect(resultsLineOf($)).toBe('Showing 1-2 of 2')
    expect(tableHeadingsOf($)).toEqual(TABLE_HEADINGS)
    expect(rowCellsOf($, 0).eq(2).text().trim()).toBe('United Kingdom')
    expect(rowCellsOf($, 0).eq(3).html().trim()).toBe(
      '<a class="govuk-link" href="/address-book/1">View<span class="govuk-visually-hidden"> Highland Livestock Ltd</span></a>'
    )
    expect(rowCellsOf($, 1).eq(2).text().trim()).toBe('France')
    expect(rowCellsOf($, 1).eq(3).html().trim()).toBe(
      '<a class="govuk-link" href="/address-book/2">View<span class="govuk-visually-hidden"> Paris Depot</span></a>'
    )
  })

  test('renders numbered pagination when more than one page', async () => {
    stubAddressPage(
      { page: '2' },
      pageOf(
        [{ id: '1', name: 'Farm', addressLine1: '1 Road', countryCode: 'GB' }],
        { page: 2, totalItems: 30, totalPages: 2 }
      )
    )

    const { html, statusCode } = await getList(
      `${LIST_URL}?page=2`,
      'list-page-2'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(html).toContain('govuk-pagination')
    expect(html).toContain('Showing 26-30 of 30')
    expect(html).toContain('?page=2')
  })

  test('forwards search query and resolves country name to countryCode', async () => {
    const scope = stubAddressPage(
      { page: '1', q: 'France', countryCode: 'FR' },
      pageOf([parisDepotAddress])
    )

    const { $, statusCode } = await getList(
      `${LIST_URL}?q=France`,
      'list-search-country'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(rowCellsOf($, 0).eq(0).html()).toBe('Paris<br> Depot')
    expect(rowCellsOf($, 0).eq(2).text().trim()).toBe('France')
    expect($('input[name="q"]').val()).toBe('France')
  })

  test.each([
    ['matches', pageOf([greenFarmAddress])],
    ['no matches', pageOf([])]
  ])(
    'Should link Clear search to the whole address book under the results line when a search has %s',
    async (_, addressPage) => {
      stubAddressPage({ page: '1', q: 'green' }, addressPage)

      const { $ } = await getList(`${LIST_URL}?q=green`, 'list-clear-search')

      const clearSearch = $('[data-testid="address-book-clear-search"]')
      expect(clearSearch.text().trim()).toBe('Clear search')
      expect(clearSearch.attr('href')).toBe(LIST_URL)
      expect(
        $('[data-testid="address-book-results-label"]')
          .next()
          .is(clearSearch.parent())
      ).toBe(true)
    }
  )

  test('pagination preserves the active search term', async () => {
    const scope = stubAddressPage(
      { page: '2', q: 'green', countryCode: 'GB' },
      pageOf([greenFarmAddress], { page: 2, totalItems: 30, totalPages: 2 })
    )

    const { html, statusCode } = await getList(
      `${LIST_URL}?q=green&countryCode=GB&page=2`,
      'list-search-page-2'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(html).toContain('?q=green&amp;countryCode=GB')
  })

  test('returns 500 when the address book cannot be reached, with the heading, intro, Add button and filter but no results line or table', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(503, { title: 'Service Unavailable' })

    const { $, html, statusCode } = await getList(LIST_URL, 'list-500')

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
      ADD_PATH
    )
    expect(contentOf($).children('form').find('input[name="q"]')).toHaveLength(
      1
    )
    expect(resultsLineOf($)).toBe('')
    expect(tableHeadingsOf($)).toEqual([])
  })
})
