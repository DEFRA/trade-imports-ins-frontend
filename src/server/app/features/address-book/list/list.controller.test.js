import { load } from 'cheerio'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '../../../../server.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../../../common/test-helpers/session-auth.js'
import {
  addressBookApi,
  runInRealMode,
  serveCountries
} from '../../../../common/test-helpers/real-mode.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORGANISATION_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const ADDRESSES_PATH = `/organisation/${ORGANISATION_ID}/addresses`
const LIST_URL = '/address-book'

const countries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

const highlandAddress = {
  id: '1',
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB'
}

const greenFarmAddress = {
  id: '1',
  name: 'Green Farm',
  addressLine1: '1 Road',
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB'
}

const pageOf = (items, overrides = {}) => ({
  items,
  page: 1,
  pageSize: 25,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
  ...overrides
})

describe('#addressBookListController', () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    serveCountries(countries)
  })

  test('renders the results count, column headings, each address row and the Add link', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([highlandAddress]))

    const { result: html, statusCode } = await server.inject({
      method: 'GET',
      url: LIST_URL,
      auth: sessionAuth('list-with-addresses')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(html).toContain('govuk-grid-column-full')
    expect(html).toContain('Address book')
    expect(html).toContain('Showing 1-1 of 1')
    const $ = load(html)
    expect(
      $('thead th')
        .map((_, heading) => $(heading).text().trim())
        .get()
    ).toEqual(['Name', 'Address', 'Country', 'Action'])
    expect(html).toContain('Highland Livestock Ltd')
    expect(html).toContain(
      '<a class="govuk-link" href="/address-book/1">View<span class="govuk-visually-hidden"> Highland Livestock Ltd</span></a>'
    )
    expect(html).toContain('14 Drover&#39;s Way, Inverness, IV2 3JH')
    expect(html).toContain('United Kingdom')
    expect(html).not.toContain('>GB<')
    expect(html).toContain('Add a new address')
    expect(html).toContain('href="/address-book/add"')
  })

  test('shows empty state when org has no addresses', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([]))

    const { result: html, statusCode } = await server.inject({
      method: 'GET',
      url: LIST_URL,
      auth: sessionAuth('list-empty')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(html).toContain('You have no addresses yet')
    expect(html).toContain('Add a new address')
    expect(html).toContain('href="/address-book/add"')
    expect(html).not.toContain('No addresses match')
  })

  test('renders numbered pagination when more than one page', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '2' })
      .reply(
        200,
        pageOf(
          [
            { id: '1', name: 'Farm', addressLine1: '1 Road', countryCode: 'GB' }
          ],
          { page: 2, totalItems: 30, totalPages: 2 }
        )
      )

    const { result: html, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?page=2',
      auth: sessionAuth('list-page-2')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(html).toContain('govuk-pagination')
    expect(html).toContain('Showing 26-30 of 30')
    expect(html).toContain('?page=2')
  })

  test('does not show clear search on the unfiltered list', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([highlandAddress]))

    const { result: html, statusCode } = await server.inject({
      method: 'GET',
      url: LIST_URL,
      auth: sessionAuth('list-no-clear-search')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(html).not.toContain('data-testid="address-book-clear-search"')
  })

  test('shows clear search when search results are returned', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1', q: 'green' })
      .reply(200, pageOf([greenFarmAddress]))

    const { result: html, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=green',
      auth: sessionAuth('list-search-with-results')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(html).toContain('data-testid="address-book-clear-search"')
    expect(html).toContain('Clear search</a>')
    expect(html).toContain('Green Farm')
    expect(html).toContain('Showing 1-1 of 1')
  })

  test('forwards search query and resolves country name to countryCode', async () => {
    const scope = addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1', q: 'France', countryCode: 'FR' })
      .reply(
        200,
        pageOf([
          {
            id: '1',
            name: 'Paris Depot',
            addressLine1: '1 Rue de Rivoli',
            townOrCity: 'Paris',
            postcode: '75001',
            countryCode: 'FR'
          }
        ])
      )

    const { result: html, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=France',
      auth: sessionAuth('list-search-country')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(html).toContain('Paris Depot')
    expect(html).toContain('France')
    expect(html).toContain('value="France"')
  })

  test('shows no-results state distinct from empty state when search has no matches', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1', q: 'zzznomatch' })
      .reply(200, pageOf([]))

    const { result: html, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=zzznomatch',
      auth: sessionAuth('list-no-results')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(html).toContain('No addresses match "zzznomatch"')
    expect(html).toContain('Clear search')
    expect(html).not.toContain('You have no addresses yet')
    expect(html).toContain('value="zzznomatch"')
  })

  test('pagination preserves the active search term', async () => {
    const scope = addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '2', q: 'green', countryCode: 'GB' })
      .reply(
        200,
        pageOf([greenFarmAddress], { page: 2, totalItems: 30, totalPages: 2 })
      )

    const { result: html, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=green&countryCode=GB&page=2',
      auth: sessionAuth('list-search-page-2')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(html).toContain('?q=green&amp;countryCode=GB')
  })

  test('returns 500 when the address book cannot be reached', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(503, { title: 'Service Unavailable' })

    const { result: html, statusCode } = await server.inject({
      method: 'GET',
      url: LIST_URL,
      auth: sessionAuth('list-500')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(html).toContain('govuk-notification-banner')
    expect(html).toContain(
      'Sorry, there is a problem with the service. Try again in a few minutes.'
    )
    expect(html).not.toContain('govuk-error-summary')
  })
})
