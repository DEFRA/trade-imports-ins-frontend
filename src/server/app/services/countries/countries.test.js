import { beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  referenceDataApi,
  refuseOutboundHttp,
  runInRealMode
} from '../../../common/test-helpers/real-mode.js'
import { getCountries } from './index.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const TRACING_HEADER = config.get('tracing.header')
const TRACE_ID = 'trace-123'

describe('against the real reference data', () => {
  runInRealMode()

  beforeEach(() => {
    getTraceIdMock.mockReturnValue(TRACE_ID)
  })

  test('Should GET /countries with the trace header and parse the list', async () => {
    const scope = referenceDataApi()
      .get('/countries')
      .matchHeader(TRACING_HEADER, TRACE_ID)
      .reply(200, [{ code: 'GB', name: 'United Kingdom' }])

    await expect(getCountries()).resolves.toEqual([
      { code: 'GB', name: 'United Kingdom' }
    ])
    expect(scope.isDone()).toBe(true)
  })

  test('Should request the given blocks', async () => {
    const scope = referenceDataApi()
      .get('/countries')
      .query({ blocks: 'country' })
      .reply(200, [])

    await getCountries(['country'])

    expect(scope.isDone()).toBe(true)
  })

  test('Should throw with the status when reference data fails', async () => {
    referenceDataApi().get('/countries').reply(503)

    await expect(getCountries()).rejects.toMatchObject({
      message: 'Failed to get countries',
      status: 503
    })
  })
})

describe('in stub mode', () => {
  refuseOutboundHttp()

  test('Should serve the canned countries without a request', async () => {
    await expect(getCountries()).resolves.toEqual([
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' },
      { code: 'DE', name: 'Germany' },
      { code: 'IE', name: 'Ireland' }
    ])
  })
})
