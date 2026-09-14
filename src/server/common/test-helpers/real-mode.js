import nock from 'nock'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { config } from '../../../config/config.js'

/** Refuses every outbound HTTP request that no nock interceptor answers, so a
 * test can never reach a service that happens to be running locally. */
export const refuseOutboundHttp = () => {
  beforeAll(() => {
    nock.disableNetConnect()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  afterAll(() => {
    nock.enableNetConnect()
  })
}

/** Runs the enclosing describe against the real HTTP clients — the suite
 * default is stub mode (vitest.config.js) — with every request intercepted. */
export const runInRealMode = () => {
  const originalStubMode = config.get('stubMode')

  refuseOutboundHttp()

  beforeAll(() => {
    config.set('stubMode', false)
  })

  afterAll(() => {
    config.set('stubMode', originalStubMode)
  })
}

export const addressBookApi = () =>
  nock(config.get('tradeImportsAddressBookApi.baseUrl'))

export const referenceDataApi = () =>
  nock(config.get('tradeImportsReferenceDataApi.baseUrl'))

export const insBackendApi = () =>
  nock(config.get('tradeImportsInsBackendApi.baseUrl'))

/** Every request for the country list, for as long as the test runs. */
export const serveCountries = (countries) =>
  referenceDataApi().persist().get('/countries').reply(200, countries)
