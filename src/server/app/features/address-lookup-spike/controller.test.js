import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { createServer } from '../../../server.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../../common/test-helpers/session-auth.js'
import {
  insBackendApi,
  runInRealMode
} from '../../../common/test-helpers/real-mode.js'
import { config } from '../../../../config/config.js'

vi.mock('../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const PAGE_PATH = '/address-lookup-spike'
const LOOKUP_PATH = '/address-lookup'
const TRACING_HEADER = config.get('tracing.header')
const TRACE_ID = 'trace-address-lookup-spike'
const MAPPED_HEADING = 'Mapped onto'
const NETWORK_FAILURE_MESSAGE = 'failed before the backend could answer'

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

const resultsResponse = (mode, overrides = {}) => ({
  outcome: 'RESULTS',
  query: { mode, term: 'SW1A 1AA' },
  results: [BUCKINGHAM_PALACE],
  totalResults: 1,
  returnedResults: 1,
  failureReason: null,
  timings: CACHED_TIMINGS,
  ...overrides
})

const search = (term, id) => ({
  method: 'POST',
  url: PAGE_PATH,
  payload: { term },
  auth: sessionAuth(id),
  headers: { [TRACING_HEADER]: TRACE_ID }
})

const chosen = (payload, id) => ({
  method: 'POST',
  url: PAGE_PATH,
  payload,
  auth: sessionAuth(id)
})

const lookupByPostcode = (postcode) =>
  insBackendApi().get(LOOKUP_PATH).query({ postcode })

const lookupByFind = (find) => insBackendApi().get(LOOKUP_PATH).query({ find })

describe.sequential('#addressLookupSpikeController', () => {
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
    config.set('csrf.enabled', false)
  })

  test('GET renders the search form with no results yet', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: PAGE_PATH,
      auth: sessionAuth('address-lookup-spike-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Address lookup spike')
    expect(result).toContain('Postcode or address')
    expect(result).toContain('govuk-grid-column-full')
    expect(result).not.toContain(MAPPED_HEADING)
  })

  test('a postcode is searched as a postcode, and find is left alone', async () => {
    const scope = lookupByPostcode('SW1A 1AA')
      .matchHeader(TRACING_HEADER, TRACE_ID)
      .reply(200, resultsResponse('POSTCODE'))

    const { result, statusCode } = await server.inject(
      search('SW1A 1AA', 'address-lookup-spike-postcode')
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('postcode=SW1A 1AA')
    expect(result).toContain('looked like a UK postcode')
    expect(result).toContain('BUCKINGHAM PALACE, LONDON, SW1A 1AA')
    expect(result).not.toContain(NETWORK_FAILURE_MESSAGE)
    expect(scope.isDone()).toBe(true)
  })

  test('anything else is searched as free text', async () => {
    const scope = lookupByFind('Buckingham Palace').reply(
      200,
      resultsResponse('FIND')
    )

    const { result } = await server.inject(
      search('Buckingham Palace', 'address-lookup-spike-find')
    )

    expect(result).toContain('find=Buckingham Palace')
    expect(result).toContain('did not look like a UK postcode')
    expect(scope.isDone()).toBe(true)
  })

  test('a postcode typed without a space is normalised before searching', async () => {
    const scope = lookupByPostcode('SW1A 1AA').reply(
      200,
      resultsResponse('POSTCODE')
    )

    await server.inject(search('  sw1a1aa  ', 'address-lookup-spike-normalise'))

    expect(scope.isDone()).toBe(true)
  })

  test('POST with an empty term asks for one and searches nothing', async () => {
    const scope = insBackendApi()
      .get(LOOKUP_PATH)
      .query(true)
      .reply(200, resultsResponse('POSTCODE'))

    const { result, statusCode } = await server.inject(
      search('   ', 'address-lookup-spike-empty')
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Enter a postcode or an address')
    expect(scope.isDone()).toBe(false)
  })

  test('a warm search shows the lookup time and says no token hops ran', async () => {
    lookupByPostcode('SW1A 1AA').reply(200, resultsResponse('POSTCODE'))

    const { result } = await server.inject(
      search('SW1A 1AA', 'address-lookup-spike-warm')
    )

    expect(result).toContain('Where the time went')
    expect(result).toContain('700ms')
    expect(result).toContain('cached access token was reused')
    expect(result).not.toContain('AWS STS')
  })

  test('a cold search shows both token hops as their own rows', async () => {
    lookupByPostcode('SW1A 1AA').reply(
      200,
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

  test('the page reports its own round trip, the backend total and the trace id', async () => {
    lookupByPostcode('SW1A 1AA').reply(200, resultsResponse('POSTCODE'))

    const { result } = await server.inject(
      search('SW1A 1AA', 'address-lookup-spike-roundtrip')
    )

    expect(result).toContain('Everything the backend did')
    expect(result).toContain('This page, including the call to the backend')
    expect(result).toContain('Trace ID')
    expect(result).toContain(TRACE_ID)
  })

  test('POST shows the failure reason when the lookup fails', async () => {
    lookupByPostcode('XX1 1XX').reply(
      200,
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
    lookupByPostcode('XX1 1XX').reply(
      200,
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
})

describe.sequential(
  '#addressLookupSpikeController — choosing and errors',
  () => {
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
      config.set('csrf.enabled', false)
    })

    test('choosing a result maps it onto the address book fields without searching again', async () => {
      const scope = insBackendApi()
        .get(LOOKUP_PATH)
        .query(true)
        .reply(200, resultsResponse('POSTCODE'))

      const { result, statusCode } = await server.inject(
        chosen(
          { term: 'SW1A 1AA', chosen: JSON.stringify(BUCKINGHAM_PALACE) },
          'address-lookup-spike-chosen'
        )
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(MAPPED_HEADING)
      expect(result).toContain('BUCKINGHAM PALACE')
      expect(result).toContain('LONDON')
      expect(scope.isDone()).toBe(false)
    })

    test('choosing a result names the gaps the lookup cannot fill', async () => {
      const { result } = await server.inject(
        chosen(
          { term: 'SW1A 1AA', chosen: JSON.stringify(BUCKINGHAM_PALACE) },
          'address-lookup-spike-gaps'
        )
      )

      expect(result).toContain('could not fill')
      expect(result).toContain('no county')
      expect(result).toContain('ISO code')
    })

    test.each([
      ['is not valid JSON', '{not json'],
      ['is not an object', 'null']
    ])(
      'choosing a result renders a warning when the chosen address %s',
      async (_description, badChosen) => {
        const { result, statusCode } = await server.inject(
          chosen(
            { term: 'SW1A 1AA', chosen: badChosen },
            'address-lookup-spike-bad-chosen'
          )
        )

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toContain('The chosen address could not be read')
        expect(result).not.toContain(MAPPED_HEADING)
      }
    )

    test('POST renders a warning when the backend itself is unreachable', async () => {
      lookupByPostcode('SW1A 1AA').replyWithError('fetch failed')

      const { result, statusCode } = await server.inject(
        search('SW1A 1AA', 'address-lookup-spike-network-error')
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(NETWORK_FAILURE_MESSAGE)
    })

    test('POST renders the same warning when the backend answers with a server error', async () => {
      lookupByPostcode('SW1A 1AA').reply(503, { title: 'Service Unavailable' })

      const { result, statusCode } = await server.inject(
        search('SW1A 1AA', 'address-lookup-spike-service-unavailable')
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(NETWORK_FAILURE_MESSAGE)
    })
  }
)
