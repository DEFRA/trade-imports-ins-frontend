import { describe, expect, test, vi } from 'vitest'

import { statusCodes } from '../../common/constants/status-codes.js'
import {
  addressAddPath,
  addressBookPath,
  ADDRESS_ID,
  addressPath,
  addressEditPath,
  getPage,
  INVALID_ADDRESS_PAYLOAD,
  postPage,
  serveStoredAddress
} from '../../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'
import { referenceDataApi } from '../../common/test-helpers/real-mode.js'
import { startRealModeServer } from '../../common/test-helpers/test-server.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ERROR_PAGE_TITLE =
  'Something went wrong - Import notification service - GOV.UK'

const refuseCountries = () =>
  referenceDataApi()
    .get('/countries')
    .reply(statusCodes.serviceUnavailable, { title: 'Service Unavailable' })

describe('#referenceDataOutage', () => {
  const getServer = startRealModeServer()

  const expectServiceUnavailablePage = ({ result, statusCode }) => {
    expect(statusCode).toBe(statusCodes.serviceUnavailable)
    expect(result).toContain(ERROR_PAGE_TITLE)
    expect(result).toContain('>503</h1>')
    expect(result).not.toContain('govuk-notification-banner')
  }

  test('Should serve the dashboard as a 503 error page', async () => {
    refuseCountries()

    expectServiceUnavailablePage(
      await getPage(getServer(), '/', 'outage-dashboard')
    )
  })

  test('Should serve the address book as a 503 error page', async () => {
    refuseCountries()

    expectServiceUnavailablePage(
      await getPage(getServer(), addressBookPath(), 'outage-list')
    )
  })

  test('Should serve the add address form as a 503 error page', async () => {
    refuseCountries()

    expectServiceUnavailablePage(
      await getPage(getServer(), addressAddPath(), 'outage-add')
    )
  })

  test('Should serve a stored address as a 503 error page', async () => {
    serveStoredAddress()
    refuseCountries()

    expectServiceUnavailablePage(
      await getPage(getServer(), addressPath(ADDRESS_ID), 'outage-view')
    )
  })

  test('Should serve saving an edited address as a 503 error page', async () => {
    serveStoredAddress()
    refuseCountries()

    expectServiceUnavailablePage(
      await postPage(
        getServer(),
        addressEditPath(ADDRESS_ID),
        'outage-edit-save',
        INVALID_ADDRESS_PAYLOAD
      )
    )
  })
})
