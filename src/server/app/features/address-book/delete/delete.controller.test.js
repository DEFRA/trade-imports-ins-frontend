import { load } from 'cheerio'
import { describe, expect, test, vi } from 'vitest'

import { config } from '../../../../../config/config.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../../../common/test-helpers/session-auth.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import { addressSummaryLines, deletedBannerText } from './delete.controller.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORGANISATION_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const addressId = '665f1c2ab3e4d51a2c9d0e77'
const ADDRESS_PATH = `/organisation/${ORGANISATION_ID}/addresses/${addressId}`
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'
const ADDRESS_BOOK_PATH = '/address-book'
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

const blankAddress = {
  id: addressId,
  name: '',
  addressLine1: '',
  townOrCity: '',
  postcode: '',
  countryCode: '',
  deleted: false
}

const RETURN_HOME = '?return=%2F'

const deleteUrl = (query = '') => `/address-book/${addressId}/delete${query}`

const getDelete = (server, session, query) =>
  server.inject({
    method: 'GET',
    url: deleteUrl(query),
    auth: sessionAuth(session)
  })

const postDelete = (server, session, query) =>
  server.inject({
    method: 'POST',
    url: deleteUrl(query),
    auth: sessionAuth(session),
    payload: {}
  })

const cookieOf = (headers) =>
  [headers['set-cookie']]
    .flat()
    .filter(Boolean)
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

// Opens the list in the same yar session the POST used, where a set banner shows.
const nextListPage = (server, session, postHeaders) => {
  addressBookApi()
    .get(`/organisation/${ORGANISATION_ID}/addresses`)
    .query(true)
    .reply(200, {
      items: [],
      page: 1,
      pageSize: 25,
      totalItems: 0,
      totalPages: 0
    })
  return server.inject({
    method: 'GET',
    url: ADDRESS_BOOK_PATH,
    auth: sessionAuth(session),
    headers: { cookie: cookieOf(postHeaders) }
  })
}

const BANNER = '.govuk-notification-banner'
const SUMMARY_VALUE = '.govuk-summary-list__value'

describe('#addressSummaryLines', () => {
  test('lists every address line in order with the country name, and no email or phone', () => {
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

  test('leaves out empty and missing values', () => {
    const lines = addressSummaryLines(
      { ...mockAddress, addressLine2: '', county: null, postcode: null },
      UK_NAME
    )

    expect(lines).toEqual([BUSINESS_NAME, LINE_1, 'Inverness', UK_NAME])
  })

  test('returns no lines for an address with no name, lines or country', () => {
    expect(addressSummaryLines({}, undefined)).toEqual([])
  })
})

describe('#deletedBannerText', () => {
  test('names the address as it is stored', () => {
    expect(deletedBannerText('ABC Green Valley Farm')).toBe(
      'ABC Green Valley Farm address deleted'
    )
  })

  test('words a blank name without a name', () => {
    expect(deletedBannerText('')).toBe('Address deleted')
    expect(deletedBannerText(undefined)).toBe('Address deleted')
  })
})

const countries = [
  { code: 'GB', name: UK_NAME },
  { code: 'FR', name: 'France' }
]

describe('#addressBookDeleteController', () => {
  const server = startRealModeServerServingCountries(countries)

  test('GET renders the confirmation with one Address summary row, the warning, Yes, delete and a No, cancel link', async () => {
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
    expect(result).toContain('This action cannot be undone.')
    expect(result).not.toContain('Are you sure you want to delete')

    const confirm = $('form button')
    expect(confirm.text().trim()).toBe('Yes, delete')
    expect(confirm.hasClass('govuk-button--warning')).toBe(true)
    const cancel = $('.govuk-button-group a.govuk-link')
    expect(cancel.text().trim()).toBe('No, cancel')
    expect(cancel.attr('href')).toBe(`/address-book/${addressId}`)
    expect($('.govuk-button--secondary')).toHaveLength(0)
  })

  test('GET shows Not applicable when the address has no name, lines or country', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, blankAddress)

    const { result, statusCode } = await getDelete(server(), 'delete-get-blank')

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)(SUMMARY_VALUE).text().trim()).toBe('Not applicable')
  })

  test('GET redirects to the address book when the address is not found', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await getDelete(server(), 'delete-get-404')

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('GET redirects to the address book for soft-deleted tombstones', async () => {
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

  test('GET redirects to the address book for a malformed address id', async () => {
    const { headers, statusCode } = await server().inject({
      method: 'GET',
      url: '/address-book/not-a-valid-id/delete',
      auth: sessionAuth('delete-get-bad-id')
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('GET returns 500 when the address book cannot be reached', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await getDelete(server(), 'delete-get-500')

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong')
  })

  test('POST redirects to the address book without deleting a soft-deleted tombstone', async () => {
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

  test('POST redirects to the address book without deleting an unknown id', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await postDelete(
      server(),
      'delete-post-unknown'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('POST treats a 404 from the delete itself as already deleted', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    addressBookApi().delete(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await postDelete(
      server(),
      'delete-post-404'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('POST returns 500 when the address book rejects the delete with a server error', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    addressBookApi()
      .delete(ADDRESS_PATH)
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await postDelete(server(), 'delete-post-500')

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong')
  })

  test('Confirm soft-deletes address and redirects to list', async () => {
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

    const list = await nextListPage(server(), 'delete-post-confirm', headers)
    expect(load(list.result)(BANNER).text()).toContain(
      'Highland Livestock Ltd address deleted'
    )
  })
})

describe('#addressBookDeleteController with a return', () => {
  const server = startRealModeServerServingCountries(countries)

  test('GET with a return points Back and No, cancel at the view page carrying it', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result, statusCode } = await getDelete(
      server(),
      'delete-get-return',
      RETURN_HOME
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    const viewHref = `/address-book/${addressId}?return=%2F`
    expect($('a.govuk-back-link').attr('href')).toBe(viewHref)
    expect($('.govuk-button-group a.govuk-link').attr('href')).toBe(viewHref)
  })

  test('POST with an INS return lands on it', async () => {
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

    const list = await nextListPage(server(), 'delete-post-return', headers)
    expect(load(list.result)(BANNER)).toHaveLength(0)
  })

  test("POST with a return to the deleted address's own page lands on the list", async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    addressBookApi().delete(ADDRESS_PATH).reply(204)
    const ownPage = `/address-book/${addressId}`

    const { headers, statusCode } = await postDelete(
      server(),
      'delete-post-return-own-page',
      `?return=${encodeURIComponent(ownPage)}`
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('POST with an animals frontend return lands on it', async () => {
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

  test('POST for an unknown id with an honoured return lands on it without deleting', async () => {
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
