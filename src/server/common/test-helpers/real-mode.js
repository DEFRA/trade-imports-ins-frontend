import nock from 'nock'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { config } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'

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

export const serveCountries = (countries) =>
  referenceDataApi()
    .persist()
    .get('/countries')
    .reply(statusCodes.ok, countries)
