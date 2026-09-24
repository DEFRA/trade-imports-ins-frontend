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

const BUCKINGHAM_PALACE = {
  addressLine: 'BUCKINGHAM PALACE, LONDON, SW1A 1AA',
  buildingNumber: null,
  buildingName: null,
  subBuildingName: 'BUCKINGHAM PALACE',
  street: null,
  locality: null,
  town: 'LONDON',
  postcode: 'SW1A 1AA',
  country: 'ENGLAND',
  uprn: '100023336901',
  match: '1',
  matchDescription: 'EXACT'
}

const CACHED_TIMINGS = {
  stsMs: null,
  entraMs: null,
  lookupMs: 700,
  totalMs: 705,
  tokenSource: 'CACHED'
}

const COLD_TIMINGS = {
  stsMs: 1092,
  entraMs: 1096,
  lookupMs: 3119,
  totalMs: 5307,
  tokenSource: 'MINTED'
}

function resultsResponse(mode, overrides = {}) {
  return {
    outcome: 'RESULTS',
    query: { mode, term: 'SW1A 1AA' },
    results: [BUCKINGHAM_PALACE],
    totalResults: 1,
    returnedResults: 1,
    failureReason: null,
    timings: CACHED_TIMINGS,
    ...overrides
  }
}

function bothModesReturn() {
  addressLookupClient.lookupByPostcode.mockResolvedValue(
    resultsResponse('POSTCODE')
  )
  addressLookupClient.lookupByFind.mockResolvedValue(resultsResponse('FIND'))
}

function search(term, id) {
  return {
    method: 'POST',
    url: '/address-lookup-spike',
    payload: { term },
    auth: sessionAuth(id)
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
    vi.mocked(addressLookupClient.lookupByPostcode).mockReset()
    vi.mocked(addressLookupClient.lookupByFind).mockReset()
  })

  test('GET renders the search form with no results yet', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-lookup-spike',
      auth: sessionAuth('address-lookup-spike-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Address lookup spike')
    expect(result).toContain('Postcode or address')
    expect(result).not.toContain('Mapped onto')
  })

  test('a postcode is searched as a postcode, and find is left alone', async () => {
    bothModesReturn()

    const { result, statusCode } = await server.inject(
      search('SW1A 1AA', 'address-lookup-spike-postcode')
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(addressLookupClient.lookupByPostcode).toHaveBeenCalledWith(
      'SW1A 1AA',
      expect.any(String)
    )
    expect(addressLookupClient.lookupByFind).not.toHaveBeenCalled()
    expect(result).toContain('postcode=SW1A 1AA')
    expect(result).toContain('looked like a UK postcode')
    expect(result).toContain('BUCKINGHAM PALACE, LONDON, SW1A 1AA')
  })

  test('anything else is searched as free text', async () => {
    bothModesReturn()

    const { result } = await server.inject(
      search('Buckingham Palace', 'address-lookup-spike-find')
    )

    expect(addressLookupClient.lookupByFind).toHaveBeenCalledWith(
      'Buckingham Palace',
      expect.any(String)
    )
    expect(addressLookupClient.lookupByPostcode).not.toHaveBeenCalled()
    expect(result).toContain('find=Buckingham Palace')
    expect(result).toContain('did not look like a UK postcode')
  })

  test('a postcode typed without a space is normalised before searching', async () => {
    bothModesReturn()

    await server.inject(search('  sw1a1aa  ', 'address-lookup-spike-normalise'))

    expect(addressLookupClient.lookupByPostcode).toHaveBeenCalledWith(
      'SW1A 1AA',
      expect.any(String)
    )
  })

  test('POST with an empty term asks for one and searches nothing', async () => {
    const { result, statusCode } = await server.inject(
      search('   ', 'address-lookup-spike-empty')
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Enter a postcode or an address')
    expect(addressLookupClient.lookupByPostcode).not.toHaveBeenCalled()
    expect(addressLookupClient.lookupByFind).not.toHaveBeenCalled()
  })

  test('a warm search shows the lookup time and says no token hops ran', async () => {
    bothModesReturn()

    const { result } = await server.inject(
      search('SW1A 1AA', 'address-lookup-spike-warm')
    )

    expect(result).toContain('Where the time went')
    expect(result).toContain('700ms')
    expect(result).toContain('cached access token was reused')
    expect(result).not.toContain('AWS STS')
  })

  test('a cold search shows both token hops as their own rows', async () => {
    addressLookupClient.lookupByPostcode.mockResolvedValue(
      resultsResponse('POSTCODE', { timings: COLD_TIMINGS })
    )

    const { result } = await server.inject(
      search('SW1A 1AA', 'address-lookup-spike-cold')
    )

    expect(result).toContain('AWS STS')
    expect(result).toContain('1092ms')
    expect(result).toContain('Entra')
    expect(result).toContain('1096ms')
    expect(result).toContain('paid for both token hops')
  })

  test('the page reports its own round trip as well as the backend total', async () => {
    bothModesReturn()

    const { result } = await server.inject(
      search('SW1A 1AA', 'address-lookup-spike-roundtrip')
    )

    expect(result).toContain('Everything the backend did')
    expect(result).toContain('This page, including the call to the backend')
  })

  test('POST shows the failure reason when the lookup fails', async () => {
    addressLookupClient.lookupByPostcode.mockResolvedValue(
      resultsResponse('POSTCODE', {
        outcome: 'FAILED',
        results: [],
        totalResults: null,
        returnedResults: 0,
        failureReason: 'HTTP_503'
      })
    )

    const { result } = await server.inject(
      search('XX1 1XX', 'address-lookup-spike-failed')
    )

    expect(result).toContain('Failed')
    expect(result).toContain('HTTP_503')
  })

  test('POST says nothing was returned when the lookup finds no addresses', async () => {
    addressLookupClient.lookupByPostcode.mockResolvedValue(
      resultsResponse('POSTCODE', {
        outcome: 'NO_RESULTS',
        results: [],
        totalResults: 0,
        returnedResults: 0
      })
    )

    const { result, statusCode } = await server.inject(
      search('XX1 1XX', 'address-lookup-spike-no-results')
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('No results')
    expect(result).toContain('Nothing returned.')
  })

  test('choosing a result maps it onto the address book fields without searching again', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-lookup-spike',
      payload: {
        term: 'SW1A 1AA',
        chosen: JSON.stringify(BUCKINGHAM_PALACE)
      },
      auth: sessionAuth('address-lookup-spike-chosen')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Mapped onto')
    expect(result).toContain('BUCKINGHAM PALACE')
    expect(result).toContain('LONDON')
    // The lookup gives every consumer 300 requests a minute between them; picking a
    // result the page already has must not cost another call.
    expect(addressLookupClient.lookupByPostcode).not.toHaveBeenCalled()
    expect(addressLookupClient.lookupByFind).not.toHaveBeenCalled()
  })

  test('choosing a result names the gaps the lookup cannot fill', async () => {
    const { result } = await server.inject({
      method: 'POST',
      url: '/address-lookup-spike',
      payload: {
        term: 'SW1A 1AA',
        chosen: JSON.stringify(BUCKINGHAM_PALACE)
      },
      auth: sessionAuth('address-lookup-spike-gaps')
    })

    expect(result).toContain('could not fill')
    expect(result).toContain('no county')
    expect(result).toContain('ISO code')
  })

  test.each([
    ['is not valid JSON', '{not json'],
    ['is not an object', 'null']
  ])(
    'choosing a result renders a warning when the chosen address %s',
    async (_description, chosen) => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/address-lookup-spike',
        payload: { term: 'SW1A 1AA', chosen },
        auth: sessionAuth('address-lookup-spike-bad-chosen')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('The chosen address could not be read')
      expect(result).not.toContain('Mapped onto')
    }
  )

  test('POST renders a warning when the backend itself is unreachable', async () => {
    addressLookupClient.lookupByPostcode.mockRejectedValue(
      new Error('fetch failed')
    )
    addressLookupClient.lookupByFind.mockRejectedValue(
      new Error('fetch failed')
    )

    const { result, statusCode } = await server.inject(
      search('SW1A 1AA', 'address-lookup-spike-network-error')
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('failed before the backend could answer')
  })
})
