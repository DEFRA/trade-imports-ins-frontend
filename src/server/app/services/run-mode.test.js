import nock from 'nock'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../config/config.js'
import { refuseOutboundHttp } from '../../common/test-helpers/real-mode.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const REFERENCE_DATA_URL = config.get('tradeImportsReferenceDataApi.baseUrl')
const TRACING_HEADER = config.get('tracing.header')
const TRACE_ID = 'trace-123'
const ZEDLAND = { code: 'ZZ', name: 'Zedland' }
const STUB_SEED = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IE', name: 'Ireland' }
]
const originalMode = process.env.STUB_MODE

const referenceData = () => nock(REFERENCE_DATA_URL)

const serveCountryList = (countries = [ZEDLAND]) =>
  referenceData().get('/countries').reply(200, countries)

const importCountriesIn = async (mode) => {
  process.env.STUB_MODE = mode
  vi.resetModules()
  return import('./countries/index.js')
}

describe('countries service', () => {
  refuseOutboundHttp()

  beforeEach(() => {
    getTraceIdMock.mockReturnValue(TRACE_ID)
  })

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.STUB_MODE
    } else {
      process.env.STUB_MODE = originalMode
    }
  })

  describe('#fetchCountries', () => {
    test('Should GET /countries with the trace header and parse the list', async () => {
      const scope = referenceData()
        .get('/countries')
        .matchHeader(TRACING_HEADER, TRACE_ID)
        .reply(200, [ZEDLAND])
      const { fetchCountries } = await import('./countries/client.js')

      await expect(fetchCountries()).resolves.toEqual([ZEDLAND])
      expect(scope.isDone()).toBe(true)
    })

    test('Should request countries filtered to the given blocks', async () => {
      const scope = referenceData()
        .get('/countries')
        .query({ blocks: 'BLOCK_ONE' })
        .reply(200, [ZEDLAND])
      const { fetchCountries } = await import('./countries/client.js')

      await expect(fetchCountries(['BLOCK_ONE'])).resolves.toEqual([ZEDLAND])
      expect(scope.isDone()).toBe(true)
    })

    test('Should throw with the status on a non-ok response', async () => {
      referenceData().get('/countries').reply(503)
      const { fetchCountries } = await import('./countries/client.js')

      await expect(fetchCountries()).rejects.toMatchObject({
        message: 'Failed to get countries',
        status: 503
      })
    })
  })

  describe('in stub mode', () => {
    test('Should serve the seeded stub list through getCountries', async () => {
      const countries = await importCountriesIn('true')

      await expect(countries.getCountries()).resolves.toEqual(STUB_SEED)
    })

    test('Should short-circuit ensureLoaded and never call reference data', async () => {
      const scope = serveCountryList()
      const countries = await importCountriesIn('true')

      await countries.ensureLoaded()

      await expect(countries.getCountries()).resolves.toEqual(STUB_SEED)
      expect(scope.isDone()).toBe(false)
    })
  })

  describe('in real mode', () => {
    test('Should load on the first read and serve the fetched list', async () => {
      const scope = serveCountryList()
      const countries = await importCountriesIn('false')

      await expect(countries.getCountries()).resolves.toEqual([ZEDLAND])
      expect(scope.isDone()).toBe(true)
    })

    test('Should fetch once across many reads once loaded', async () => {
      const scope = serveCountryList()
      const countries = await importCountriesIn('false')

      await countries.getCountries()
      await countries.getCountries()

      await expect(countries.getCountries()).resolves.toEqual([ZEDLAND])
      expect(scope.isDone()).toBe(true)
    })

    test('Should re-attempt on the next read after a failed load', async () => {
      referenceData().get('/countries').reply(503)
      const countries = await importCountriesIn('false')

      await expect(countries.getCountries()).rejects.toMatchObject({
        isBoom: true
      })

      const scope = serveCountryList()
      await expect(countries.getCountries()).resolves.toEqual([ZEDLAND])
      expect(scope.isDone()).toBe(true)
    })

    test('Should reject with a serverUnavailable Boom on load failure', async () => {
      referenceData().get('/countries').reply(503)
      const countries = await importCountriesIn('false')

      await expect(countries.getCountries()).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 503 },
        data: { dataset: 'countries' }
      })
    })
  })

  describe('mode resolution', () => {
    test('Should select real mode when the flag is false', async () => {
      process.env.STUB_MODE = 'false'
      vi.resetModules()
      const { isStubMode } = await import('../../common/services/mode.js')

      expect(isStubMode()).toBe(false)
    })

    test('Should select stub mode when the flag is true', async () => {
      process.env.STUB_MODE = 'true'
      vi.resetModules()
      const { isStubMode } = await import('../../common/services/mode.js')

      expect(isStubMode()).toBe(true)
    })
  })
})
