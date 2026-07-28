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

const addressId = '665f1c2ab3e4d51a2c9d0e77'

const mockCountries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

const mockAddress = {
  id: addressId,
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  addressLine2: 'Unit 2',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com',
  deleted: false
}

const validPayload = {
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  addressLine2: '',
  townOrCity: 'Inverness',
  county: '',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com'
}

describe('#addressBookEditController', () => {
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
    vi.mocked(addressBookClient.getAddress).mockReset()
    vi.mocked(addressBookClient.updateAddress).mockReset()
  })

  test('GET renders prefilled edit form', async () => {
    addressBookClient.getAddress.mockResolvedValue(mockAddress)

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Edit address details')
    expect(result).toContain('value="Highland Livestock Ltd"')
    expect(result).toContain('value="Unit 2"')
    expect(result).not.toContain('operator')
  })

  test('POST updates address and redirects with success banner', async () => {
    addressBookClient.updateAddress.mockResolvedValue({
      ...mockAddress,
      name: 'Updated Farm Ltd'
    })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-post-success'),
      payload: {
        ...validPayload,
        name: 'Updated Farm Ltd'
      }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
    expect(addressBookClient.updateAddress).toHaveBeenCalledWith(
      '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88',
      expect.any(String),
      addressId,
      expect.objectContaining({
        name: 'Updated Farm Ltd',
        addressLine2: '',
        county: ''
      })
    )
  })

  test('POST with invalid data re-renders form with errors', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-post-invalid'),
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
    expect(addressBookClient.updateAddress).not.toHaveBeenCalled()
  })

  test('Cancel returns to list without updating', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/edit`,
      auth: sessionAuth('edit-post-cancel'),
      payload: { cancel: 'true' }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
    expect(addressBookClient.updateAddress).not.toHaveBeenCalled()
  })
})
