import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '#/server/common/test-helpers/mock-auth.js'
import { addressLookupClient } from '#/server/common/clients/address-lookup-client.js'

vi.mock('#/auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock(
  '#/server/common/clients/address-lookup-client.js',
  () => import('#/server/common/clients/__mocks__/address-lookup-client.js')
)

function resultsResponse(overrides = {}) {
  return {
    outcome: 'RESULTS',
    query: { mode: 'POSTCODE', term: 'SW1A 1AA' },
    results: [
      {
        addressLine: '1 DOWNING STREET, LONDON, SW1A 2AA',
        postcode: 'SW1A 2AA',
        matchDescription: 'EXACT',
        uprn: '100023336901'
      }
    ],
    totalResults: 1,
    returnedResults: 1,
    failureReason: null,
    ...overrides
  }
}

describe('#addressLookupSpikeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.mocked(addressLookupClient.lookupDefaultPostcode).mockReset()
  })

  test('GET renders the heading and button with no results yet', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-lookup-spike',
      auth: sessionAuth('address-lookup-spike-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Address lookup spike')
    expect(result).toContain('Test the address lookup')
    expect(result).not.toContain('Diagnostics')
  })

  test('POST renders the results and the raw response', async () => {
    addressLookupClient.lookupDefaultPostcode.mockResolvedValue(
      resultsResponse()
    )

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-lookup-spike',
      auth: sessionAuth('address-lookup-spike-post')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(addressLookupClient.lookupDefaultPostcode).toHaveBeenCalledWith(
      expect.any(String)
    )
    expect(result).toContain('1 DOWNING STREET, LONDON, SW1A 2AA')
    expect(result).toContain('Raw response')
  })

  test('POST renders a no-results outcome without a results table', async () => {
    addressLookupClient.lookupDefaultPostcode.mockResolvedValue(
      resultsResponse({
        outcome: 'NO_RESULTS',
        results: [],
        totalResults: 0,
        returnedResults: 0
      })
    )

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-lookup-spike',
      auth: sessionAuth('address-lookup-spike-no-results')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(addressLookupClient.lookupDefaultPostcode).toHaveBeenCalledWith(
      expect.any(String)
    )
    expect(result).toContain('No results')
    expect(result).not.toContain('Address line')
    expect(result).not.toContain('UPRN')
  })

  test('POST renders the failure reason when the lookup fails', async () => {
    addressLookupClient.lookupDefaultPostcode.mockResolvedValue(
      resultsResponse({
        outcome: 'FAILED',
        results: [],
        totalResults: null,
        returnedResults: 0,
        failureReason: 'TIMEOUT'
      })
    )

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-lookup-spike',
      auth: sessionAuth('address-lookup-spike-failed')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(addressLookupClient.lookupDefaultPostcode).toHaveBeenCalledWith(
      expect.any(String)
    )
    expect(result).toContain('Failed')
    expect(result).toContain('TIMEOUT')
  })

  test('POST renders a warning when the backend itself is unreachable', async () => {
    addressLookupClient.lookupDefaultPostcode.mockRejectedValue(
      new Error('fetch failed')
    )

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-lookup-spike',
      auth: sessionAuth('address-lookup-spike-network-error')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('failed before the backend could answer')
  })
})
