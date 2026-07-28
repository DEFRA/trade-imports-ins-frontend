import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '#/server/common/test-helpers/mock-auth.js'
import { addressBookClient } from '#/server/common/clients/address-book-client.js'
import { countriesClient } from '#/server/common/clients/countries-client.js'

vi.mock('#/auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('#/server/common/clients/address-book-client.js')
vi.mock('#/server/common/clients/countries-client.js')

const mockCountries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

describe('#addressBookAddController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.mocked(countriesClient.getCountries).mockResolvedValue(mockCountries)
    vi.mocked(addressBookClient.createAddress).mockReset()
  })

  test('GET renders the add address details form', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add',
      auth: sessionAuth('add-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Add address details')
    expect(result).toContain('Name or organisation name')
    expect(result).not.toContain('operator')
  })

  test('GET renders country select options from reference data', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add',
      auth: sessionAuth('add-get-countries')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('value="GB"')
    expect(result).toContain('United Kingdom')
    expect(result).toContain('value="FR"')
    expect(result).toContain('France')
  })

  test('POST creates address and redirects with success banner', async () => {
    addressBookClient.createAddress.mockResolvedValue({
      id: '665f1c2ab3e4d51a2c9d0e77',
      name: 'Highland Livestock Ltd'
    })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-success'),
      payload: {
        name: 'Highland Livestock Ltd',
        addressLine1: "14 Drover's Way",
        townOrCity: 'Inverness',
        postcode: 'IV2 3JH',
        countryCode: 'GB',
        phone: '+44 1463 234567',
        email: 'exports@example.com'
      }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
    expect(addressBookClient.createAddress).toHaveBeenCalledTimes(1)
  })

  test('POST with invalid data re-renders form with errors', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-invalid'),
      payload: {
        name: '',
        addressLine1: '',
        townOrCity: '',
        postcode: '',
        countryCode: '',
        phone: '',
        email: 'bad'
      }
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('There is a problem')
    expect(addressBookClient.createAddress).not.toHaveBeenCalled()
  })

  test('Cancel returns to list without creating an address', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-cancel'),
      payload: { cancel: 'true' }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
    expect(addressBookClient.createAddress).not.toHaveBeenCalled()
  })
})
