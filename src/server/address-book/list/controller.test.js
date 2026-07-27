import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { sessionAuth, mockOidcConfig } from '#/server/common/test-helpers/mock-auth.js'
import { addressBookClient } from '#/server/common/clients/address-book-client.js'

vi.mock('#/auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('#/server/common/clients/address-book-client.js')

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
          addressLine1: '14 Drover\'s Way',
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
    expect(result).toContain('Highland Livestock Ltd')
    expect(result).toContain('14 Drover&#39;s Way, Inverness, IV2 3JH')
    expect(result).toContain('GB')
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
  })

  test('renders numbered pagination when more than one page', async () => {
    addressBookClient.listAddresses.mockResolvedValue({
      items: [{ id: '1', name: 'Farm', addressLine1: '1 Road', countryCode: 'GB' }],
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
    expect(result).toContain('?page=2')
  })
})
