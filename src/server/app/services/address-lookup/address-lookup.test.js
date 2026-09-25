import { beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  insBackendApi,
  refuseOutboundHttp,
  runInRealMode
} from '../../../common/test-helpers/real-mode.js'
import {
  lookupByFind,
  lookupByPostcode,
  lookupDefaultPostcode
} from './index.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const TRACING_HEADER = config.get('tracing.header')
const TRACE_ID = 'trace-123'
const LOOKUP_PATH = '/address-lookup'

const EXPECTED_UPRNS = ['100023336901', '100023336902', '100023336903']
const FIND_TERM = '10 Downing Street & Co'

const emptyResults = (mode, term) => ({
  outcome: 'RESULTS',
  query: { mode, term },
  results: [],
  totalResults: 0,
  returnedResults: 0
})

describe('against the real INS backend', () => {
  runInRealMode()

  beforeEach(() => {
    getTraceIdMock.mockReturnValue(TRACE_ID)
  })

  test('Should GET /address-lookup with no query and the trace header', async () => {
    const scope = insBackendApi()
      .get(LOOKUP_PATH)
      .matchHeader(TRACING_HEADER, TRACE_ID)
      .reply(200, emptyResults('POSTCODE', 'SW1A 1AA'))

    const result = await lookupDefaultPostcode()

    expect(result.outcome).toBe('RESULTS')
    expect(scope.isDone()).toBe(true)
  })

  test('Should GET /address-lookup?postcode= with the trace header', async () => {
    const scope = insBackendApi()
      .get(LOOKUP_PATH)
      .query({ postcode: 'SW1A 2AA' })
      .matchHeader(TRACING_HEADER, TRACE_ID)
      .reply(200, emptyResults('POSTCODE', 'SW1A 2AA'))

    const result = await lookupByPostcode('SW1A 2AA')

    expect(result.query.term).toBe('SW1A 2AA')
    expect(scope.isDone()).toBe(true)
  })

  test('Should GET /address-lookup?find= with the trace header', async () => {
    const scope = insBackendApi()
      .get(LOOKUP_PATH)
      .query({ find: FIND_TERM })
      .matchHeader(TRACING_HEADER, TRACE_ID)
      .reply(200, emptyResults('FIND', FIND_TERM))

    const result = await lookupByFind(FIND_TERM)

    expect(result.query.term).toBe(FIND_TERM)
    expect(scope.isDone()).toBe(true)
  })

  test('Should throw with the status and message on a non-2xx response', async () => {
    insBackendApi()
      .get(LOOKUP_PATH)
      .reply(500, { title: 'Internal Server Error' })

    await expect(lookupDefaultPostcode()).rejects.toMatchObject({
      status: 500,
      message: 'Internal Server Error'
    })
  })
})

describe('in stub mode', () => {
  refuseOutboundHttp()

  test('Should serve the three fixed addresses without a request', async () => {
    const result = await lookupByPostcode('SW1A 1AA')

    expect(result.outcome).toBe('RESULTS')
    expect(result.totalResults).toBe(3)
    expect(result.results.map((address) => address.uprn)).toEqual(
      EXPECTED_UPRNS
    )
  })

  test('Should serve the same three addresses for a free-text search', async () => {
    const result = await lookupByFind('anything')

    expect(result.query.mode).toBe('FIND')
    expect(result.results.map((address) => address.uprn)).toEqual(
      EXPECTED_UPRNS
    )
  })

  test('Should default the postcode search term when none is given', async () => {
    const result = await lookupDefaultPostcode()

    expect(result.query.term).toBe('SW1A 1AA')
  })
})
