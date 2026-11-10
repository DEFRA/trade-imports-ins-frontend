import { load } from 'cheerio'
import { describe, expect, test } from 'vitest'

import { config } from '../../../../../config/config.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import { textOf } from '../../../../common/test-helpers/rendered-text.js'
import {
  addressBookPath,
  ADDRESS_ID,
  addressApiPath,
  addressPath,
  BACK_LINK,
  COUNTRIES,
  addressDeletePath,
  expectRedirectTo,
  expectServerErrorPage,
  getPage,
  interceptAddressBookRequest,
  MALFORMED_ADDRESS_ID,
  ORGANISATION_ID_HEADER,
  postPage,
  serveAddressBookServerError,
  serveAddressNotFound,
  serveStoredAddress,
  STORED_ADDRESS
} from '../../../../common/test-helpers/address-book-requests.js'
import { openEmptyAddressBookWithCookiesFrom } from '../../../../common/test-helpers/open-empty-address-book-with-cookies.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import { pathWithReturn } from '../return-to.js'
import {
  addressSummaryLines,
  deletedSuccessMessage
} from './delete.controller.js'

const UK_NAME = 'United Kingdom'

const getDelete = (server, sessionId, returnTo) =>
  getPage(
    server,
    pathWithReturn(addressDeletePath(ADDRESS_ID), returnTo),
    sessionId
  )

const postDelete = (server, sessionId, returnTo) =>
  postPage(
    server,
    pathWithReturn(addressDeletePath(ADDRESS_ID), returnTo),
    sessionId,
    {}
  )

const BANNER = '.govuk-notification-banner'
const ADDRESS_DELETED = 'Address deleted'
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
    expect(deletedSuccessMessage('')).toBe(ADDRESS_DELETED)
    expect(deletedSuccessMessage(undefined)).toBe(ADDRESS_DELETED)
  })
})

describe('GET /address-book/{addressId}/delete', () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  test('Should render the confirmation with one Address summary row, the warning, Yes, delete and a No, cancel link', async () => {
    serveStoredAddress()

    const { result, statusCode } = await getDelete(getServer(), 'delete-get')

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect(textOf($, 'h1')).toBe('Delete this address?')
    expect(textOf($, 'head > title')).toBe(
      'Delete this address? - Import notification service - GOV.UK'
    )
    expect($('.govuk-summary-list__key')).toHaveLength(1)
    expect(textOf($, '.govuk-summary-list__key')).toBe('Address')
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
    expect(textOf($, confirmButton)).toBe('Yes, delete')
    expect(confirmButton.hasClass('govuk-button--warning')).toBe(true)
    const cancelLink = $('.govuk-button-group a.govuk-link')
    expect(textOf($, cancelLink)).toBe('No, cancel')
    expect(cancelLink.attr('href')).toBe(addressPath(ADDRESS_ID))
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

    const { result, statusCode } = await getDelete(
      getServer(),
      'delete-get-blank'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(textOf(load(result), SUMMARY_VALUE)).toBe('Not applicable')
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
      getServer(),
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
      await getDelete(getServer(), 'delete-get-404'),
      addressBookPath()
    )
  })

  test('Should redirect to the address book for soft-deleted tombstones', async () => {
    serveStoredAddress({ ...STORED_ADDRESS, deleted: true })

    expectRedirectTo(
      await getDelete(getServer(), 'delete-get-tombstone'),
      addressBookPath()
    )
  })

  test('Should redirect to the address book for a malformed address id', async () => {
    expectRedirectTo(
      await getPage(
        getServer(),
        addressDeletePath(MALFORMED_ADDRESS_ID),
        'delete-get-bad-id'
      ),
      addressBookPath()
    )
  })

  test('Should return 500 when the address book answers the lookup with a server error', async () => {
    serveAddressBookServerError(addressApiPath(ADDRESS_ID))

    expectServerErrorPage(await getDelete(getServer(), 'delete-get-500'))
  })

  describe('with a return', () => {
    test('Should point Back and No, cancel at the address page carrying the return', async () => {
      serveStoredAddress()

      const { result, statusCode } = await getDelete(
        getServer(),
        'delete-get-return',
        '/'
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      const addressPageHref = pathWithReturn(addressPath(ADDRESS_ID), '/')
      expect($(BACK_LINK).attr('href')).toBe(addressPageHref)
      expect($('.govuk-button-group a.govuk-link').attr('href')).toBe(
        addressPageHref
      )
    })
  })
})

describe('POST /address-book/{addressId}/delete', () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  const interceptDeleteOf = (addressId) =>
    addressBookApi().delete(addressApiPath(addressId))

  const interceptUnwantedDelete = () =>
    interceptAddressBookRequest('DELETE', addressApiPath(ADDRESS_ID))

  test('Should redirect to the address book without deleting a soft-deleted tombstone', async () => {
    serveStoredAddress({ ...STORED_ADDRESS, deleted: true })
    const deletion = interceptUnwantedDelete()

    expectRedirectTo(
      await postDelete(getServer(), 'delete-post-tombstone'),
      addressBookPath()
    )
    deletion.expectNotSent()
  })

  test('Should redirect to the address book without deleting an unknown id', async () => {
    serveAddressNotFound(ADDRESS_ID)
    const deletion = interceptUnwantedDelete()

    expectRedirectTo(
      await postDelete(getServer(), 'delete-post-unknown'),
      addressBookPath()
    )
    deletion.expectNotSent()
  })

  test('Should treat a 404 from the delete itself as already deleted', async () => {
    serveStoredAddress()
    const scope = interceptDeleteOf(ADDRESS_ID).reply(statusCodes.notFound, {
      message: 'Not found'
    })

    expectRedirectTo(
      await postDelete(getServer(), 'delete-post-404'),
      addressBookPath()
    )
    expect(scope.isDone()).toBe(true)
  })

  test('Should return 500 when the address book rejects the delete with a server error', async () => {
    serveStoredAddress()
    interceptDeleteOf(ADDRESS_ID).reply(statusCodes.serviceUnavailable, {
      title: 'Service Unavailable'
    })

    expectServerErrorPage(await postDelete(getServer(), 'delete-post-500'))
  })

  test('Should send the delete for the organisation and redirect to the address book', async () => {
    serveStoredAddress()
    const scope = interceptDeleteOf(ADDRESS_ID)
      .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
      .reply(statusCodes.noContent)

    expectRedirectTo(
      await postDelete(getServer(), 'delete-post-confirm'),
      addressBookPath()
    )
    expect(scope.isDone()).toBe(true)
  })

  test('Should show the address deleted banner naming the address on the address book after a delete', async () => {
    serveStoredAddress()
    interceptDeleteOf(ADDRESS_ID).reply(statusCodes.noContent)

    const { headers } = await postDelete(getServer(), 'delete-post-banner')

    const listResponse = await openEmptyAddressBookWithCookiesFrom(
      getServer(),
      'delete-post-banner',
      headers
    )
    expect(load(listResponse.result)(BANNER).text()).toContain(
      `${STORED_ADDRESS.name} address deleted`
    )
  })

  test('Should land on the address book saying Address deleted after deleting an address with a blank name', async () => {
    serveStoredAddress({ ...STORED_ADDRESS, name: '' })
    interceptDeleteOf(ADDRESS_ID).reply(statusCodes.noContent)

    const response = await postDelete(getServer(), 'delete-post-banner-unnamed')

    expectRedirectTo(response, addressBookPath())
    const listResponse = await openEmptyAddressBookWithCookiesFrom(
      getServer(),
      'delete-post-banner-unnamed',
      response.headers
    )
    expect(
      textOf(load(listResponse.result), '.govuk-notification-banner__heading')
    ).toBe(ADDRESS_DELETED)
  })

  describe('with a return', () => {
    test('Should delete the address and land on an INS return', async () => {
      serveStoredAddress()
      const scope = interceptDeleteOf(ADDRESS_ID).reply(statusCodes.noContent)

      expectRedirectTo(
        await postDelete(getServer(), 'delete-post-return', '/'),
        '/'
      )
      expect(scope.isDone()).toBe(true)
    })

    test('Should show no deleted banner on the address book after landing on an INS return', async () => {
      serveStoredAddress()
      interceptDeleteOf(ADDRESS_ID).reply(statusCodes.noContent)

      const { headers } = await postDelete(
        getServer(),
        'delete-post-return-banner',
        '/'
      )

      const listResponse = await openEmptyAddressBookWithCookiesFrom(
        getServer(),
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
          getServer(),
          'delete-post-return-own-page',
          addressPath(ADDRESS_ID)
        ),
        addressBookPath()
      )
    })

    test('Should land on an animals frontend return', async () => {
      const animalsUrl = `${new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin}/live-animals/notifications/abc`
      serveStoredAddress()
      interceptDeleteOf(ADDRESS_ID).reply(statusCodes.noContent)

      expectRedirectTo(
        await postDelete(getServer(), 'delete-post-return-animals', animalsUrl),
        animalsUrl
      )
    })

    test('Should land on an honoured return without deleting an unknown id', async () => {
      serveAddressNotFound(ADDRESS_ID)
      const deletion = interceptUnwantedDelete()

      expectRedirectTo(
        await postDelete(getServer(), 'delete-post-return-unknown', '/'),
        '/'
      )
      deletion.expectNotSent()
    })
  })
})
