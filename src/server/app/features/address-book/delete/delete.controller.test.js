import { load } from 'cheerio'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '../../../../server.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../../../common/test-helpers/session-auth.js'
import {
  addressBookApi,
  runInRealMode,
  serveCountries
} from '../../../../common/test-helpers/real-mode.js'
import { addressSummaryLines, deletedBannerText } from './delete.controller.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const addressId = '665f1c2ab3e4d51a2c9d0e77'
const ADDRESS_PATH = `/organisation/${ORG_ID}/addresses/${addressId}`
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

  test('leaves out blank and whitespace-only values', () => {
    const lines = addressSummaryLines(
      { ...mockAddress, addressLine2: '', county: '   ', postcode: null },
      UK_NAME
    )

    expect(lines).toEqual([BUSINESS_NAME, LINE_1, 'Inverness', UK_NAME])
  })

  test('leaves out a line repeating an earlier one ignoring case', () => {
    const lines = addressSummaryLines(
      { ...mockAddress, county: 'INVERNESS' },
      UK_NAME
    )

    expect(lines.filter((line) => line.toLowerCase() === 'inverness')).toEqual([
      'Inverness'
    ])
  })

  test('returns no lines for an address with no name, lines or country', () => {
    expect(addressSummaryLines({}, undefined)).toEqual([])
  })
})

describe('#deletedBannerText', () => {
  test('capitalises the first letter and lower-cases the rest', () => {
    expect(deletedBannerText('Green Valley Farm')).toBe(
      'Green valley farm address deleted'
    )
  })

  test('words a blank name without a name', () => {
    expect(deletedBannerText('  ')).toBe('Address deleted')
    expect(deletedBannerText(undefined)).toBe('Address deleted')
  })
})

describe('#addressBookDeleteController', () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    serveCountries([
      { code: 'GB', name: UK_NAME },
      { code: 'FR', name: 'France' }
    ])
  })

  test('GET renders the Design Release 2.1 confirmation', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('h1').text().trim()).toBe('Delete this address?')
    expect($('head > title').text().replace(/\s+/g, ' ').trim()).toBe(
      'Delete this address? - Import notification service - GOV.UK'
    )
    expect($('.govuk-summary-list__key')).toHaveLength(1)
    expect($('.govuk-summary-list__key').text().trim()).toBe('Address')
    expect($('.govuk-summary-list__value').html().trim()).toBe(
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
    addressBookApi().get(ADDRESS_PATH).reply(200, {
      id: addressId,
      name: '',
      addressLine1: '',
      townOrCity: '',
      postcode: '',
      countryCode: '',
      deleted: false
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get-blank')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)('.govuk-summary-list__value').text().trim()).toBe(
      'Not applicable'
    )
  })

  test('GET redirects to the address book when the address is not found', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get-404')
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('GET redirects to the address book for soft-deleted tombstones', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { headers, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get-tombstone')
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('GET redirects to the address book for a malformed address id', async () => {
    const { headers, statusCode } = await server.inject({
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

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-get-500')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong')
  })

  test('POST redirects to the address book without deleting a soft-deleted tombstone', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { headers, statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-tombstone'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('POST redirects to the address book without deleting an unknown id', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-unknown'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('POST treats a 404 from the delete itself as already deleted', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    addressBookApi().delete(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-404'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('POST returns 500 when the address book rejects the delete with a server error', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    addressBookApi()
      .delete(ADDRESS_PATH)
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-500'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong')
  })

  test('Confirm soft-deletes address and redirects to list', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    const scope = addressBookApi()
      .delete(ADDRESS_PATH)
      .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
      .reply(204)

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `/address-book/${addressId}/delete`,
      auth: sessionAuth('delete-post-confirm'),
      payload: {}
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
    expect(scope.isDone()).toBe(true)
  })
})
