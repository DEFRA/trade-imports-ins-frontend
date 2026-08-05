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

const addressId = '665f1c2ab3e4d51a2c9d0e77'

const mockAddress = {
  id: addressId,
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com',
  deleted: false
}

describe('#addressBookDeleteController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.mocked(addressBookClient.getAddress).mockReset()
    vi.mocked(addressBookClient.deleteAddress).mockReset()
  })

  test('GET renders delete confirmation page', async () => {
    addressBookClient.getAddress.mockResolvedValue(mockAddress)

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Delete address')
    expect(result).toContain('Highland Livestock Ltd')
    expect(result).toContain('Yes, delete this address')
    expect(result).not.toContain('Delete operator')
  })

  test('GET returns 404 when address is not found', async () => {
    addressBookClient.getAddress.mockRejectedValue(
      Object.assign(new Error('Not found'), { status: 404 })
    )

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get-404')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET returns 404 for soft-deleted tombstones', async () => {
    addressBookClient.getAddress.mockResolvedValue({
      ...mockAddress,
      deleted: true
    })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get-tombstone')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('POST returns 404 when deleteAddress rejects with 404', async () => {
    addressBookClient.getAddress.mockResolvedValue(mockAddress)
    addressBookClient.deleteAddress.mockRejectedValue(
      Object.assign(new Error('Not found'), { status: 404 })
    )

    const { statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-404'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('POST returns 404 for soft-deleted tombstones', async () => {
    addressBookClient.getAddress.mockResolvedValue({
      ...mockAddress,
      deleted: true
    })

    const { statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-tombstone'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.notFound)
    expect(addressBookClient.deleteAddress).not.toHaveBeenCalled()
  })

  test('Cancel returns to address details without deleting', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-cancel'),
      payload: { cancel: 'true' }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe(`/address-book/${addressId}`)
    expect(addressBookClient.deleteAddress).not.toHaveBeenCalled()
  })

  test('Confirm soft-deletes address and redirects to list', async () => {
    addressBookClient.getAddress.mockResolvedValue(mockAddress)
    addressBookClient.deleteAddress.mockResolvedValue(undefined)

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-confirm'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
    expect(addressBookClient.deleteAddress).toHaveBeenCalledWith(
      '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88',
      expect.any(String),
      addressId
    )
  })
})
