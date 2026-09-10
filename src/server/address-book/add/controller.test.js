import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '#/server/common/test-helpers/mock-auth.js'
import { addressBookClient } from '#/server/common/clients/address-book-client.js'
import { countriesClient } from '#/server/common/clients/countries-client.js'
import { config } from '#/config/config.js'
import { JOURNEY_TYPES } from '../journey-registry.js'

vi.mock('#/auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock(
  '#/server/common/clients/address-book-client.js',
  () => import('#/server/common/clients/__mocks__/address-book-client.js')
)
vi.mock('#/server/common/clients/countries-client.js')

const mockCountries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

describe.sequential('#addressBookAddController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    config.set('csrf.enabled', false)
    config.set('tradeImportsAnimalsFrontend.baseUrl', 'http://localhost:3000')
    vi.mocked(countriesClient.getCountries).mockResolvedValue(mockCountries)
  })

  const handshakeQuery =
    '?journey-type=gbn-ag&notification-id=GBN-AG-26-4F7K2P&fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
  const handshakeFields = {
    'journey-type': 'gbn-ag',
    'notification-id': 'GBN-AG-26-4F7K2P',
    'fulfilment-id': '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
  }

  test('GET renders the add address details form', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add',
      auth: sessionAuth('add-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Add address details')
    expect(result).toContain('Enter address details')
    expect(result).toContain('Enter contact details')
    expect(result).toContain('Name or organisation name')
    expect(result).toContain('Postcode or Zip code')
    expect(result).toContain('Phone number')
    expect(result).toContain(
      'For international numbers include the country code'
    )
    expect(result).toContain('Save and continue')
    expect(result).toContain('Cancel and return to address book')
    expect(result).not.toContain('operator')
    expect(result).not.toContain('Save changes')
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

  test('POST re-renders form when API returns 400 validation errors', async () => {
    vi.mocked(addressBookClient.createAddress).mockReset()
    vi.mocked(addressBookClient.createAddress).mockRejectedValue({
      status: 400,
      body: {
        errors: {
          email: ['Enter an email address in the correct format']
        }
      },
      message: 'Validation failed'
    })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-api-400'),
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

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('Enter an email address in the correct format')
    expect(addressBookClient.createAddress).toHaveBeenCalled()
  })

  test('POST creates address and redirects with success banner', async () => {
    vi.mocked(addressBookClient.createAddress).mockReset()
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
    expect(addressBookClient.createAddress).toHaveBeenCalledWith(
      '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88',
      expect.any(String),
      expect.objectContaining({
        name: 'Highland Livestock Ltd',
        addressLine1: "14 Drover's Way",
        townOrCity: 'Inverness',
        postcode: 'IV2 3JH',
        countryCode: 'GB',
        phone: '+44 1463 234567',
        email: 'exports@example.com'
      })
    )
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

  test('GET with handshake query renders the add form', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/add${handshakeQuery}`,
      auth: sessionAuth('add-get-handshake')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Add address details')
  })

  test('GET refuses an unrecognised journey type', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add?journey-type=not-a-journey&notification-id=GBN-AG-26-4F7K2P&fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d',
      auth: sessionAuth('add-get-unknown-journey')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('POST handshake save redirects to animals with the new address id', async () => {
    vi.mocked(addressBookClient.createAddress).mockReset()
    addressBookClient.createAddress.mockResolvedValue({
      id: '665f1c2ab3e4d51a2c9d0e77',
      name: 'Highland Livestock Ltd'
    })

    const post = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-handshake-session'),
      payload: {
        ...handshakeFields,
        name: 'Highland Livestock Ltd',
        addressLine1: "14 Drover's Way",
        townOrCity: 'Inverness',
        postcode: 'IV2 3JH',
        countryCode: 'GB',
        phone: '+44 1463 234567',
        email: 'exports@example.com'
      }
    })

    expect(post.statusCode).toBe(statusCodes.redirect)
    expect(post.headers.location).toBe(
      'http://localhost:3000/notifications/GBN-AG-26-4F7K2P/address-return?fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d&addressId=665f1c2ab3e4d51a2c9d0e77'
    )
    expect(JOURNEY_TYPES.GBN_AG).toBe('gbn-ag')
  })

  test('POST handshake cancel returns to animals without creating an address', async () => {
    const post = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-handshake-cancel'),
      payload: { cancel: 'true', ...handshakeFields }
    })

    expect(post.statusCode).toBe(statusCodes.redirect)
    expect(post.headers.location).toBe(
      'http://localhost:3000/notifications/GBN-AG-26-4F7K2P/address-return?fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
    )
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
