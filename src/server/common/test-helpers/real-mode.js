import nock from 'nock'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

import { config } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

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

const runWithStubMode = (stubMode) => {
  refuseOutboundHttp()
  restoreConfigAfterEach(['stubMode'])

  const setStubMode = () => {
    config.set('stubMode', stubMode)
  }
  beforeAll(setStubMode)
  beforeEach(setStubMode)
}

export const runInRealMode = () => runWithStubMode(false)

export const runInStubMode = () => runWithStubMode(true)

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
