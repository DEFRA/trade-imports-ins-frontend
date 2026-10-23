import { load } from 'cheerio'
import { describe, expect, test, vi } from 'vitest'

import { config } from '../../../../../config/config.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import {
  expectServerErrorPage,
  getPage,
  MALFORMED_ADDRESS_ID,
  ORGANISATION_ID_HEADER,
  postPage,
  serveAddressBookServerError
} from '../../../../common/test-helpers/address-book-requests.js'
import { openEmptyAddressBookWithCookiesFrom } from '../../../../common/test-helpers/open-empty-address-book-with-cookies.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import {
  addressSummaryLines,
  deletedSuccessMessage
} from './delete.controller.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORGANISATION_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const addressId = '665f1c2ab3e4d51a2c9d0e77'
const ADDRESS_PATH = `/organisation/${ORGANISATION_ID}/addresses/${addressId}`
const ADDRESS_BOOK_PATH = '/address-book'
const ADDRESS_PAGE_PATH = `/address-book/${addressId}`
const UK_NAME = 'United Kingdom'
const EMAIL = 'exports@example.com'
const PHONE = '+44 1463 234567'
const BUSINESS_NAME = 'Highland Livestock Ltd'
const LINE_1 = "14 Drover's Way"

const mockAddress = {
  id: addressId,
  name: BUSINESS_NAME,
  addressLine1: LINE_1,
  addressLine2: 'Unit 2',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: PHONE,
  email: EMAIL,
  deleted: false
}

const RETURN_HOME = '?return=%2F'

const deleteUrl = (query = '') => `/address-book/${addressId}/delete${query}`

const getDelete = (server, sessionId, query) =>
  getPage(server, deleteUrl(query), sessionId)

const postDelete = (server, sessionId, query) =>
  postPage(server, deleteUrl(query), sessionId, {})

const BANNER = '.govuk-notification-banner'
const SUMMARY_VALUE = '.govuk-summary-list__value'

describe('#addressSummaryLines', () => {
  test('Should list every address line in order with the country name, and no email or phone', () => {
    expect(addressSummaryLines(mockAddress, UK_NAME)).toEqual([
      BUSINESS_NAME,
      LINE_1,
      'Unit 2',
      'Inverness',
      'Highland',
      'IV2 3JH',
      UK_NAME
    ])
  })

  test('Should leave out empty and missing values', () => {
    const lines = addressSummaryLines(
      { ...mockAddress, addressLine2: '', county: null, postcode: null },
      UK_NAME
    )

    expect(lines).toEqual([BUSINESS_NAME, LINE_1, 'Inverness', UK_NAME])
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

const countries = [
  { code: 'GB', name: UK_NAME },
  { code: 'FR', name: 'France' }
]

describe('GET /address-book/{addressId}/delete', () => {
  const server = startRealModeServerServingCountries(countries)

  test('Should render the confirmation with one Address summary row, the warning, Yes, delete and a No, cancel link', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

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
      `${BUSINESS_NAME}<br>${LINE_1}<br>Unit 2<br>Inverness<br>Highland<br>IV2 3JH<br>${UK_NAME}`
    )
    expect(result).not.toContain(EMAIL)
    expect(result).not.toContain(PHONE)
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
    expect(cancelLink.attr('href')).toBe(ADDRESS_PAGE_PATH)
    expect($('.govuk-button--secondary')).toHaveLength(0)
  })

  test('Should show Not applicable when the address has no name, lines or country', async () => {
    const blankAddress = {
      id: addressId,
      name: '',
      addressLine1: '',
      townOrCity: '',
      postcode: '',
      countryCode: '',
      deleted: false
    }
    addressBookApi().get(ADDRESS_PATH).reply(200, blankAddress)

    const { result, statusCode } = await getDelete(server(), 'delete-get-blank')

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)(SUMMARY_VALUE).text().trim()).toBe('Not applicable')
  })

  test('Should redirect to the address book when the address is not found', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await getDelete(server(), 'delete-get-404')

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('Should redirect to the address book for soft-deleted tombstones', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { headers, statusCode } = await getDelete(
      server(),
      'delete-get-tombstone'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('Should redirect to the address book for a malformed address id', async () => {
    const { headers, statusCode } = await getPage(
      server(),
      `/address-book/${MALFORMED_ADDRESS_ID}/delete`,
      'delete-get-bad-id'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('Should return 500 when the address book cannot be reached', async () => {
    serveAddressBookServerError(ADDRESS_PATH)

    expectServerErrorPage(await getDelete(server(), 'delete-get-500'))
  })

  describe('with a return', () => {
    test('Should point Back and No, cancel at the address page carrying the return', async () => {
      addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

      const { result, statusCode } = await getDelete(
        server(),
        'delete-get-return',
        RETURN_HOME
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      const addressPageHref = `${ADDRESS_PAGE_PATH}${RETURN_HOME}`
      expect($('a.govuk-back-link').attr('href')).toBe(addressPageHref)
      expect($('.govuk-button-group a.govuk-link').attr('href')).toBe(
        addressPageHref
      )
    })
  })
})

describe('POST /address-book/{addressId}/delete', () => {
  const server = startRealModeServerServingCountries(countries)

  test('Should redirect to the address book without deleting a soft-deleted tombstone', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { headers, statusCode } = await postDelete(
      server(),
      'delete-post-tombstone'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('Should redirect to the address book without deleting an unknown id', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await postDelete(
      server(),
      'delete-post-unknown'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('Should treat a 404 from the delete itself as already deleted', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    addressBookApi().delete(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await postDelete(
      server(),
      'delete-post-404'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('Should return 500 when the address book rejects the delete with a server error', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    addressBookApi()
      .delete(ADDRESS_PATH)
      .reply(503, { title: 'Service Unavailable' })

    expectServerErrorPage(await postDelete(server(), 'delete-post-500'))
  })

  test('Should soft-delete the address for the organisation and redirect to the address book', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    const scope = addressBookApi()
      .delete(ADDRESS_PATH)
      .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
      .reply(204)

    const { statusCode, headers } = await postDelete(
      server(),
      'delete-post-confirm'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
    expect(scope.isDone()).toBe(true)
  })

  test('Should show the address deleted banner naming the address on the address book after a delete', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    addressBookApi().delete(ADDRESS_PATH).reply(204)

    const { headers } = await postDelete(server(), 'delete-post-banner')

    const listResponse = await openEmptyAddressBookWithCookiesFrom(
      server(),
      'delete-post-banner',
      headers
    )
    expect(load(listResponse.result)(BANNER).text()).toContain(
      `${BUSINESS_NAME} address deleted`
    )
  })

  describe('with a return', () => {
    test('Should delete the address and land on an INS return', async () => {
      addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
      const scope = addressBookApi().delete(ADDRESS_PATH).reply(204)

      const { headers, statusCode } = await postDelete(
        server(),
        'delete-post-return',
        RETURN_HOME
      )

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/')
      expect(scope.isDone()).toBe(true)
    })

    test('Should show no deleted banner on the address book after landing on an INS return', async () => {
      addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
      addressBookApi().delete(ADDRESS_PATH).reply(204)

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
      addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
      addressBookApi().delete(ADDRESS_PATH).reply(204)

      const { headers, statusCode } = await postDelete(
        server(),
        'delete-post-return-own-page',
        `?return=${encodeURIComponent(ADDRESS_PAGE_PATH)}`
      )

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe(ADDRESS_BOOK_PATH)
    })

    test('Should land on an animals frontend return', async () => {
      const animalsUrl = `${new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin}/live-animals/notifications/abc`
      addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
      addressBookApi().delete(ADDRESS_PATH).reply(204)

      const { headers, statusCode } = await postDelete(
        server(),
        'delete-post-return-animals',
        `?return=${encodeURIComponent(animalsUrl)}`
      )

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe(animalsUrl)
    })

    test('Should land on an honoured return without deleting an unknown id', async () => {
      addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

      const { headers, statusCode } = await postDelete(
        server(),
        'delete-post-return-unknown',
        RETURN_HOME
      )

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/')
    })
  })
})
