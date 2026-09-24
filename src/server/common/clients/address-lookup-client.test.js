import nock from 'nock'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { addressLookupClient } from './address-lookup-client.real.js'

vi.mock('#/config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'tradeImportsInsBackendApi.baseUrl') {
        return 'http://localhost:8090'
      }
      if (key === 'tracing.header') {
        return 'x-cdp-request-id'
      }
      return undefined
    })
  }
}))

describe('#addressLookupClient (real)', () => {
  const traceId = 'trace-123'

  beforeEach(() => {
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  test('GETs /address-lookup with the tracing header and parses JSON', async () => {
    const scope = nock('http://localhost:8090')
      .get('/address-lookup')
      .matchHeader('x-cdp-request-id', traceId)
      .reply(200, {
        outcome: 'RESULTS',
        query: { mode: 'POSTCODE', term: 'SW1A 1AA' },
        results: [],
        totalResults: 0,
        returnedResults: 0
      })

    const result = await addressLookupClient.lookupDefaultPostcode(traceId)

    expect(result.outcome).toBe('RESULTS')
    expect(result.query.term).toBe('SW1A 1AA')
    expect(scope.isDone()).toBe(true)
  })

  test('GETs /address-lookup?postcode= with the postcode encoded, the tracing header and parses JSON', async () => {
    const scope = nock('http://localhost:8090')
      .get('/address-lookup')
      .query({ postcode: 'SW1A 2AA' })
      .matchHeader('x-cdp-request-id', traceId)
      .reply(200, {
        outcome: 'RESULTS',
        query: { mode: 'POSTCODE', term: 'SW1A 2AA' },
        results: [],
        totalResults: 0,
        returnedResults: 0
      })

    const result = await addressLookupClient.lookupByPostcode(
      'SW1A 2AA',
      traceId
    )

    expect(result.outcome).toBe('RESULTS')
    expect(result.query.term).toBe('SW1A 2AA')
    expect(scope.isDone()).toBe(true)
  })

  test('GETs /address-lookup?find= with the search text encoded, the tracing header and parses JSON', async () => {
    const scope = nock('http://localhost:8090')
      .get('/address-lookup')
      .query({ find: '10 Downing Street & Co' })
      .matchHeader('x-cdp-request-id', traceId)
      .reply(200, {
        outcome: 'RESULTS',
        query: { mode: 'FIND', term: '10 Downing Street & Co' },
        results: [],
        totalResults: 0,
        returnedResults: 0
      })

    const result = await addressLookupClient.lookupByFind(
      '10 Downing Street & Co',
      traceId
    )

    expect(result.outcome).toBe('RESULTS')
    expect(result.query.term).toBe('10 Downing Street & Co')
    expect(scope.isDone()).toBe(true)
  })

  test('throws with status and message on a non-2xx response', async () => {
    nock('http://localhost:8090')
      .get('/address-lookup')
      .reply(500, { title: 'Internal Server Error' })

    await expect(
      addressLookupClient.lookupDefaultPostcode(traceId)
    ).rejects.toMatchObject({ status: 500, message: 'Internal Server Error' })
  })
})
