import { describe, expect, test, vi } from 'vitest'

import { statusCodes } from '../../common/constants/status-codes.js'
import { INVALID_ADDRESS_PAYLOAD } from '../../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../common/test-helpers/session-auth.js'
import {
  addressBookApi,
  referenceDataApi
} from '../../common/test-helpers/real-mode.js'
import { startRealModeServer } from '../../common/test-helpers/test-server.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'
const ERROR_PAGE_TITLE =
  'Something went wrong - Import notification service - GOV.UK'

const STORED_ADDRESS = {
  id: ADDRESS_ID,
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  deleted: false
}

const refuseCountries = () =>
  referenceDataApi()
    .get('/countries')
    .reply(statusCodes.serviceUnavailable, { title: 'Service Unavailable' })

describe('#referenceDataOutage', () => {
  const server = startRealModeServer()

  const expectServiceUnavailablePage = ({ result, statusCode }) => {
    expect(statusCode).toBe(statusCodes.serviceUnavailable)
    expect(result).toContain(ERROR_PAGE_TITLE)
    expect(result).toContain('>503</h1>')
    expect(result).not.toContain('govuk-notification-banner')
  }

  test('Should serve the dashboard as a 503 error page', async () => {
    refuseCountries()

    expectServiceUnavailablePage(
      await server().inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('outage-dashboard')
      })
    )
  })

  test('Should serve the address book as a 503 error page', async () => {
    refuseCountries()

    expectServiceUnavailablePage(
      await server().inject({
        method: 'GET',
        url: '/address-book',
        auth: sessionAuth('outage-list')
      })
    )
  })

  test('Should serve the add address form as a 503 error page', async () => {
    refuseCountries()

    expectServiceUnavailablePage(
      await server().inject({
        method: 'GET',
        url: '/address-book/add',
        auth: sessionAuth('outage-add')
      })
    )
  })

  test('Should serve a stored address as a 503 error page', async () => {
    addressBookApi()
      .get(`/organisation/${ORG_ID}/addresses/${ADDRESS_ID}`)
      .reply(statusCodes.ok, STORED_ADDRESS)
    refuseCountries()

    expectServiceUnavailablePage(
      await server().inject({
        method: 'GET',
        url: `/address-book/${ADDRESS_ID}`,
        auth: sessionAuth('outage-view')
      })
    )
  })

  test('Should serve saving an edited address as a 503 error page', async () => {
    addressBookApi()
      .get(`/organisation/${ORG_ID}/addresses/${ADDRESS_ID}`)
      .reply(statusCodes.ok, STORED_ADDRESS)
    refuseCountries()

    expectServiceUnavailablePage(
      await server().inject({
        method: 'POST',
        url: `/address-book/${ADDRESS_ID}/edit`,
        auth: sessionAuth('outage-edit-save'),
        payload: INVALID_ADDRESS_PAYLOAD
      })
    )
  })
})
