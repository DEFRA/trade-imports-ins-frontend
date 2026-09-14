import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '../../../../server.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '../../../../common/test-helpers/mock-auth.js'
import {
  addressBookApi,
  runInRealMode,
  serveCountries
} from '../../../../common/test-helpers/real-mode.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const ADDRESSES_PATH = `/organisation/${ORG_ID}/addresses`

const countries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

const highland = {
  id: '1',
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB'
}

const greenFarm = {
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

  test('renders address list with Name, Address and Country columns', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([highland]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book',
      auth: sessionAuth('list-with-addresses')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Address book')
    expect(result).toContain('Showing 1-1 of 1')
    expect(result).toContain('Highland Livestock Ltd')
    expect(result).toContain(
      '<a class="govuk-link" href="/address-book/1">View<span class="govuk-visually-hidden"> Highland Livestock Ltd</span></a>'
    )
    expect(result).toContain('14 Drover&#39;s Way, Inverness, IV2 3JH')
    expect(result).toContain('United Kingdom')
    expect(result).not.toContain('>GB<')
    expect(result).toContain('Add a new address')
    expect(result).not.toContain('operator')
  })

  test('shows empty state when org has no addresses', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book',
      auth: sessionAuth('list-empty')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('You have no addresses yet')
    expect(result).toContain('Add a new address')
    expect(result).not.toContain('No addresses match')
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

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?page=2',
      auth: sessionAuth('list-page-2')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('govuk-pagination')
    expect(result).toContain('Showing 26-30 of 30')
    expect(result).toContain('?page=2')
  })

  test('does not show clear search on the unfiltered list', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([highland]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book',
      auth: sessionAuth('list-no-clear-search')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).not.toContain('data-testid="address-book-clear-search"')
  })

  test('shows clear search when search results are returned', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1', q: 'green' })
      .reply(200, pageOf([greenFarm]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=green',
      auth: sessionAuth('list-search-with-results')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('data-testid="address-book-clear-search"')
    expect(result).toContain('Clear search</a>')
    expect(result).toContain('Green Farm')
    expect(result).toContain('Showing 1-1 of 1')
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

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=France',
      auth: sessionAuth('list-search-country')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(result).toContain('Paris Depot')
    expect(result).toContain('France')
    expect(result).toContain('value="France"')
  })

  test('shows no-results state distinct from empty state when search has no matches', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1', q: 'zzznomatch' })
      .reply(200, pageOf([]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=zzznomatch',
      auth: sessionAuth('list-no-results')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('No addresses match "zzznomatch"')
    expect(result).toContain('Clear search')
    expect(result).not.toContain('You have no addresses yet')
    expect(result).toContain('value="zzznomatch"')
  })

  test('pagination preserves the active search term', async () => {
    const scope = addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '2', q: 'green', countryCode: 'GB' })
      .reply(
        200,
        pageOf([greenFarm], { page: 2, totalItems: 30, totalPages: 2 })
      )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=green&countryCode=GB&page=2',
      auth: sessionAuth('list-search-page-2')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(result).toContain('?q=green&amp;countryCode=GB')
  })

  test('returns 500 when the address book cannot be reached', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book',
      auth: sessionAuth('list-500')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong loading your address book')
  })
})
