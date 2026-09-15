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
import { buildRows } from './controller.js'

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
  addressLine2: 'Unit 2',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com',
  deleted: false
}

describe('#buildRows', () => {
  test('renders each Standard Address Block field on its own row, labelled as on the edit form', () => {
    const rows = buildRows(mockAddress, 'United Kingdom')

    expect(rows.map((row) => row.key.text)).toEqual([
      'Name or organisation name',
      'Address line 1',
      'Address line 2 (optional)',
      'Town or city',
      'County',
      'Postcode or Zip code',
      'Country',
      'Email address',
      'Phone number'
    ])
    expect(rows.map((row) => row.value.text)).toEqual([
      'Highland Livestock Ltd',
      "14 Drover's Way",
      'Unit 2',
      'Inverness',
      'Highland',
      'IV2 3JH',
      'United Kingdom',
      'exports@example.com',
      '+44 1463 234567'
    ])
  })

  test('falls back to the country code when the name cannot be resolved', () => {
    const rows = buildRows(mockAddress, undefined)

    expect(rows.find((row) => row.key.text === 'Country').value.text).toBe('GB')
  })
})

describe('#addressBookViewController', () => {
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
    serveCountries([
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' }
    ])
  })

  test('GET renders read-only address details with Edit and Delete actions', async () => {
    const scope = addressBookApi()
      .get(ADDRESS_PATH)
      .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
      .reply(200, mockAddress)

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(result).toContain('Highland Livestock Ltd')
    expect(result).toContain('14 Drover&#39;s Way')
    expect(result).toContain('Inverness')
    expect(result).toContain('IV2 3JH')
    // Each field renders on its own row, not concatenated into a single address line.
    expect(result).not.toContain(
      '14 Drover&#39;s Way, Unit 2, Inverness, Highland, IV2 3JH'
    )
    expect(result).toContain('United Kingdom')
    expect(result).not.toContain('>GB<')
    expect(result).toContain('exports@example.com')
    expect(result).toContain(`/address-book/${addressId}/edit`)
    expect(result).toContain(`/address-book/${addressId}/delete`)
    expect(result).not.toContain('operator')
    expect(result).not.toContain('Type')
  })

  test('GET returns 404 when address is not found', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-not-found')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET returns 404 for malformed address id without reaching the address book', async () => {
    // No interceptor: the route's id validation must answer before the handler
    // runs, otherwise the refused request would surface as a 500.
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/not-a-valid-id',
      auth: sessionAuth('view-bad-id')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET returns 404 for soft-deleted tombstones', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-get-tombstone')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET returns 500 when the address book cannot be reached', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-get-500')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong')
  })
})
