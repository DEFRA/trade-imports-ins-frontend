import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '#/server/common/test-helpers/mock-auth.js'
import { addressBookClient } from '#/server/common/clients/address-book-client.js'

vi.mock('#/auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock(
  '#/server/common/clients/address-book-client.js',
  () => import('#/server/common/clients/__mocks__/address-book-client.js')
)

vi.mock('#/server/common/clients/countries-client.js', () => ({
  countriesClient: {
    getCountries: vi.fn().mockResolvedValue([
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' }
    ])
  }
}))

describe('#addressBookListController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.mocked(addressBookClient.listAddresses).mockReset()
  })

  test('renders address list with Name, Address and Country columns', async () => {
    addressBookClient.listAddresses.mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Highland Livestock Ltd',
          addressLine1: "14 Drover's Way",
          townOrCity: 'Inverness',
          postcode: 'IV2 3JH',
          countryCode: 'GB'
        }
      ],
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1
    })

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
    addressBookClient.listAddresses.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 25,
      totalItems: 0,
      totalPages: 0
    })

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
    addressBookClient.listAddresses.mockResolvedValue({
      items: [
        { id: '1', name: 'Farm', addressLine1: '1 Road', countryCode: 'GB' }
      ],
      page: 2,
      pageSize: 25,
      totalItems: 30,
      totalPages: 2
    })

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
    addressBookClient.listAddresses.mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Highland Livestock Ltd',
          addressLine1: "14 Drover's Way",
          townOrCity: 'Inverness',
          postcode: 'IV2 3JH',
          countryCode: 'GB'
        }
      ],
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book',
      auth: sessionAuth('list-no-clear-search')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).not.toContain('data-testid="address-book-clear-search"')
  })

  test('shows clear search when search results are returned', async () => {
    addressBookClient.listAddresses.mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Green Farm',
          addressLine1: '1 Road',
          townOrCity: 'Inverness',
          postcode: 'IV2 3JH',
          countryCode: 'GB'
        }
      ],
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1
    })

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
    addressBookClient.listAddresses.mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Paris Depot',
          addressLine1: '1 Rue de Rivoli',
          townOrCity: 'Paris',
          postcode: '75001',
          countryCode: 'FR'
        }
      ],
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=France',
      auth: sessionAuth('list-search-country')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(addressBookClient.listAddresses).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ q: 'France', countryCode: 'FR' })
    )
    expect(result).toContain('Paris Depot')
    expect(result).toContain('France')
    expect(result).toContain('value="France"')
  })

  test('shows no-results state distinct from empty state when search has no matches', async () => {
    addressBookClient.listAddresses.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 25,
      totalItems: 0,
      totalPages: 0
    })

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
    addressBookClient.listAddresses.mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Green Farm',
          addressLine1: '1 Road',
          countryCode: 'GB'
        }
      ],
      page: 2,
      pageSize: 25,
      totalItems: 30,
      totalPages: 2
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=green&countryCode=GB&page=2',
      auth: sessionAuth('list-search-page-2')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('?q=green&amp;countryCode=GB')
    expect(addressBookClient.listAddresses).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ q: 'green', countryCode: 'GB', page: 2 })
    )
  })

  test('returns 500 when listAddresses fails', async () => {
    addressBookClient.listAddresses.mockRejectedValue(new Error('API down'))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book',
      auth: sessionAuth('list-500')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong loading your address book')
  })
})
