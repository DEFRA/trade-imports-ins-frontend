import { describe, expect, test, vi } from 'vitest'

import { createServer } from '../../../../server.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '../../../../common/test-helpers/mock-auth.js'
import {
  addressBookApi,
  runInRealMode
} from '../../../../common/test-helpers/real-mode.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const addressId = '665f1c2ab3e4d51a2c9d0e77'
const ADDRESS_PATH = `/organisation/${ORG_ID}/addresses/${addressId}`
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

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

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET renders delete confirmation page', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

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
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get-404')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET returns 404 for soft-deleted tombstones', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get-tombstone')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET returns 500 when the address book cannot be reached', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get-500')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong')
  })

  test('POST returns 404 when the address book rejects the delete with 404', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    addressBookApi().delete(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-404'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('POST returns 500 when the address book rejects the delete with a server error', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    addressBookApi()
      .delete(ADDRESS_PATH)
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-500'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong')
  })

  test('POST returns 404 for soft-deleted tombstones without deleting', async () => {
    // No DELETE interceptor: a delete would be refused by nock and surface as a
    // 500, not the 404 asserted here.
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-tombstone'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.notFound)
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
  })

  test('Confirm soft-deletes address and redirects to list', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    const scope = addressBookApi()
      .delete(ADDRESS_PATH)
      .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
      .reply(204)

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-confirm'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
    expect(scope.isDone()).toBe(true)
  })
})
