import { load } from 'cheerio'
import { describe, expect, test, vi } from 'vitest'

import { config } from '../../../../../config/config.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import {
  ADDRESS_BOOK_PATH,
  ADDRESS_ID,
  addressApiPath,
  addressPagePath,
  BACK_LINK,
  COUNTRIES,
  deleteAddressPagePath,
  expectRedirectTo,
  expectServerErrorPage,
  getPage,
  MALFORMED_ADDRESS_ID,
  ORGANISATION_ID_HEADER,
  postPage,
  RETURN_HOME,
  serveAddressBookServerError,
  serveAddressNotFound,
  serveStoredAddress,
  STORED_ADDRESS
} from '../../../../common/test-helpers/address-book-requests.js'
import { openEmptyAddressBookWithCookiesFrom } from '../../../../common/test-helpers/open-empty-address-book-with-cookies.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import {
  addressSummaryLines,
  deletedSuccessMessage
} from './delete.controller.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const UK_NAME = 'United Kingdom'

const getDelete = (server, sessionId, query = '') =>
  getPage(server, `${deleteAddressPagePath(ADDRESS_ID)}${query}`, sessionId)

const postDelete = (server, sessionId, query = '') =>
  postPage(
    server,
    `${deleteAddressPagePath(ADDRESS_ID)}${query}`,
    sessionId,
    {}
  )

const BANNER = '.govuk-notification-banner'
const SUMMARY_VALUE = '.govuk-summary-list__value'

describe('#addressSummaryLines', () => {
  test('Should list every address line in order with the country name, and no email or phone', () => {
    expect(addressSummaryLines(STORED_ADDRESS, UK_NAME)).toEqual([
      STORED_ADDRESS.name,
      STORED_ADDRESS.addressLine1,
      STORED_ADDRESS.addressLine2,
      STORED_ADDRESS.townOrCity,
      STORED_ADDRESS.county,
      STORED_ADDRESS.postcode,
      UK_NAME
    ])
  })

  test('Should leave out empty and missing values', () => {
    const lines = addressSummaryLines(
      { ...STORED_ADDRESS, addressLine2: '', county: null, postcode: null },
      UK_NAME
    )

    expect(lines).toEqual([
      STORED_ADDRESS.name,
      STORED_ADDRESS.addressLine1,
      STORED_ADDRESS.townOrCity,
      UK_NAME
    ])
  })

  test('Should leave out an address line 2 and county that hold only spaces', () => {
    const lines = addressSummaryLines(
      { ...STORED_ADDRESS, addressLine2: '   ', county: ' ' },
      UK_NAME
    )

    expect(lines).toEqual([
      STORED_ADDRESS.name,
      STORED_ADDRESS.addressLine1,
      STORED_ADDRESS.townOrCity,
      STORED_ADDRESS.postcode,
      UK_NAME
    ])
  })

  test('Should return no lines for an address with no name, lines or country', () => {
    expect(addressSummaryLines({}, undefined)).toEqual([])
  })
})

describe('#deletedSuccessMessage', () => {
  test('Should name the address as it is stored', () => {
    expect(deletedSuccessMessage('ABC Green Valley Farm')).toBe(
      'ABC Green Valley Farm address deleted'
    )
  })

  test('Should word a blank name without a name', () => {
    expect(deletedSuccessMessage('')).toBe('Address deleted')
    expect(deletedSuccessMessage(undefined)).toBe('Address deleted')
  })
})

describe('GET /address-book/{addressId}/delete', () => {
  const server = startRealModeServerServingCountries(COUNTRIES)

  test('Should render the confirmation with one Address summary row, the warning, Yes, delete and a No, cancel link', async () => {
    serveStoredAddress()

    const { result, statusCode } = await getDelete(server(), 'delete-get')

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('h1').text().trim()).toBe('Delete this address?')
    expect($('head > title').text().replace(/\s+/g, ' ').trim()).toBe(
      'Delete this address? - Import notification service - GOV.UK'
    )
    expect($('.govuk-summary-list__key')).toHaveLength(1)
    expect($('.govuk-summary-list__key').text().trim()).toBe('Address')
    expect($(SUMMARY_VALUE).html().trim()).toBe(
      [
        STORED_ADDRESS.name,
        STORED_ADDRESS.addressLine1,
        STORED_ADDRESS.addressLine2,
        STORED_ADDRESS.townOrCity,
        STORED_ADDRESS.county,
        STORED_ADDRESS.postcode,
        UK_NAME
      ].join('<br> ')
    )
    expect(result).not.toContain(STORED_ADDRESS.email)
    expect(result).not.toContain(STORED_ADDRESS.phone)
    expect(result).toContain('Confirm that you want to delete this address.')
    expect(result).toContain(
      'Deletions are permanent and you cannot undo this.'
    )
    expect(result).not.toContain('Are you sure you want to delete')

    const confirmButton = $('form button')
    expect(confirmButton.text().trim()).toBe('Yes, delete')
    expect(confirmButton.hasClass('govuk-button--warning')).toBe(true)
    const cancelLink = $('.govuk-button-group a.govuk-link')
    expect(cancelLink.text().trim()).toBe('No, cancel')
    expect(cancelLink.attr('href')).toBe(addressPagePath(ADDRESS_ID))
    expect($('.govuk-button--secondary')).toHaveLength(0)
  })

  test('Should show Not applicable when the address has no name, lines or country', async () => {
    serveStoredAddress({
      id: ADDRESS_ID,
      name: '',
      addressLine1: '',
      townOrCity: '',
      postcode: '',
      countryCode: '',
      deleted: false
    })

    const { result, statusCode } = await getDelete(server(), 'delete-get-blank')

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)(SUMMARY_VALUE).text().trim()).toBe('Not applicable')
  })

  test('Should escape markup in a stored name and address line', async () => {
    serveStoredAddress({
      id: ADDRESS_ID,
      name: '<b>Bold</b> Farm',
      addressLine1: '1 <i>Lane</i> End',
      townOrCity: 'Inverness',
      postcode: 'IV2 3JH',
      countryCode: 'GB',
      deleted: false
    })

    const { result, statusCode } = await getDelete(
      server(),
      'delete-get-escaping'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($(SUMMARY_VALUE).html().trim()).toBe(
      `&lt;b&gt;Bold&lt;/b&gt; Farm<br> 1 &lt;i&gt;Lane&lt;/i&gt; End<br> Inverness<br> IV2 3JH<br> ${UK_NAME}`
    )
    expect($(`${SUMMARY_VALUE} b, ${SUMMARY_VALUE} i`)).toHaveLength(0)
  })

  test('Should redirect to the address book when the address is not found', async () => {
    serveAddressNotFound(ADDRESS_ID)

    expectRedirectTo(
      await getDelete(server(), 'delete-get-404'),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should redirect to the address book for soft-deleted tombstones', async () => {
    serveStoredAddress({ ...STORED_ADDRESS, deleted: true })

    expectRedirectTo(
      await getDelete(server(), 'delete-get-tombstone'),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should redirect to the address book for a malformed address id', async () => {
    expectRedirectTo(
      await getPage(
        server(),
        deleteAddressPagePath(MALFORMED_ADDRESS_ID),
        'delete-get-bad-id'
      ),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should return 500 when the address book answers the lookup with a server error', async () => {
    serveAddressBookServerError(addressApiPath(ADDRESS_ID))

    expectServerErrorPage(await getDelete(server(), 'delete-get-500'))
  })

  describe('with a return', () => {
    test('Should point Back and No, cancel at the address page carrying the return', async () => {
      serveStoredAddress()

      const { result, statusCode } = await getDelete(
        server(),
        'delete-get-return',
        RETURN_HOME
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      const addressPageHref = `${addressPagePath(ADDRESS_ID)}${RETURN_HOME}`
      expect($(BACK_LINK).attr('href')).toBe(addressPageHref)
      expect($('.govuk-button-group a.govuk-link').attr('href')).toBe(
        addressPageHref
      )
    })
  })
})

describe('POST /address-book/{addressId}/delete', () => {
  const server = startRealModeServerServingCountries(COUNTRIES)

  const interceptDeleteOf = (addressId) =>
    addressBookApi().delete(addressApiPath(addressId))

  test('Should redirect to the address book without deleting a soft-deleted tombstone', async () => {
    serveStoredAddress({ ...STORED_ADDRESS, deleted: true })

    expectRedirectTo(
      await postDelete(server(), 'delete-post-tombstone'),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should redirect to the address book without deleting an unknown id', async () => {
    serveAddressNotFound(ADDRESS_ID)

    expectRedirectTo(
      await postDelete(server(), 'delete-post-unknown'),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should treat a 404 from the delete itself as already deleted', async () => {
    serveStoredAddress()
    interceptDeleteOf(ADDRESS_ID).reply(statusCodes.notFound, {
      message: 'Not found'
    })

    expectRedirectTo(
      await postDelete(server(), 'delete-post-404'),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should return 500 when the address book rejects the delete with a server error', async () => {
    serveStoredAddress()
    interceptDeleteOf(ADDRESS_ID).reply(statusCodes.serviceUnavailable, {
      title: 'Service Unavailable'
    })

    expectServerErrorPage(await postDelete(server(), 'delete-post-500'))
  })

  test('Should send the delete for the organisation and redirect to the address book', async () => {
    serveStoredAddress()
    const scope = interceptDeleteOf(ADDRESS_ID)
      .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
      .reply(statusCodes.noContent)

    expectRedirectTo(
      await postDelete(server(), 'delete-post-confirm'),
      ADDRESS_BOOK_PATH
    )
    expect(scope.isDone()).toBe(true)
  })

  test('Should show the address deleted banner naming the address on the address book after a delete', async () => {
    serveStoredAddress()
    interceptDeleteOf(ADDRESS_ID).reply(statusCodes.noContent)

    const { headers } = await postDelete(server(), 'delete-post-banner')

    const listResponse = await openEmptyAddressBookWithCookiesFrom(
      server(),
      'delete-post-banner',
      headers
    )
    expect(load(listResponse.result)(BANNER).text()).toContain(
      `${STORED_ADDRESS.name} address deleted`
    )
  })

  describe('with a return', () => {
    test('Should delete the address and land on an INS return', async () => {
      serveStoredAddress()
      const scope = interceptDeleteOf(ADDRESS_ID).reply(statusCodes.noContent)

      expectRedirectTo(
        await postDelete(server(), 'delete-post-return', RETURN_HOME),
        '/'
      )
      expect(scope.isDone()).toBe(true)
    })

    test('Should show no deleted banner on the address book after landing on an INS return', async () => {
      serveStoredAddress()
      interceptDeleteOf(ADDRESS_ID).reply(statusCodes.noContent)

      const { headers } = await postDelete(
        server(),
        'delete-post-return-banner',
        RETURN_HOME
      )

      const listResponse = await openEmptyAddressBookWithCookiesFrom(
        server(),
        'delete-post-return-banner',
        headers
      )
      expect(load(listResponse.result)(BANNER)).toHaveLength(0)
    })

    test("Should land on the address book for a return to the deleted address's own page", async () => {
      serveStoredAddress()
      interceptDeleteOf(ADDRESS_ID).reply(statusCodes.noContent)

      expectRedirectTo(
        await postDelete(
          server(),
          'delete-post-return-own-page',
          `?return=${encodeURIComponent(addressPagePath(ADDRESS_ID))}`
        ),
        ADDRESS_BOOK_PATH
      )
    })

    test('Should land on an animals frontend return', async () => {
      const animalsUrl = `${new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin}/live-animals/notifications/abc`
      serveStoredAddress()
      interceptDeleteOf(ADDRESS_ID).reply(statusCodes.noContent)

      expectRedirectTo(
        await postDelete(
          server(),
          'delete-post-return-animals',
          `?return=${encodeURIComponent(animalsUrl)}`
        ),
        animalsUrl
      )
    })

    test('Should land on an honoured return without deleting an unknown id', async () => {
      serveAddressNotFound(ADDRESS_ID)

      expectRedirectTo(
        await postDelete(server(), 'delete-post-return-unknown', RETURN_HOME),
        '/'
      )
    })
  })
})
