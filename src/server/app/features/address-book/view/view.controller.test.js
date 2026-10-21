import { load } from 'cheerio'
import { describe, expect, test, vi } from 'vitest'

import { config } from '../../../../../config/config.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../../../common/test-helpers/session-auth.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import { buildRows } from './view.controller.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORGANISATION_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const addressId = '665f1c2ab3e4d51a2c9d0e77'
const ADDRESS_PATH = `/organisation/${ORGANISATION_ID}/addresses/${addressId}`
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'
const BUSINESS_NAME = 'Highland Livestock Ltd'
const EMAIL = 'exports@example.com'
const UK_NAME = 'United Kingdom'
const ADDRESS_BOOK_PATH = '/address-book'
const BACK_LINK = 'a.govuk-back-link'

const mockAddress = {
  id: addressId,
  name: BUSINESS_NAME,
  addressLine1: "14 Drover's Way",
  addressLine2: 'Unit 2',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: EMAIL,
  deleted: false
}

describe('#buildRows', () => {
  test('leaves out address line 2 and county when the address has neither', () => {
    const rows = buildRows(
      { ...mockAddress, addressLine2: '', county: null },
      UK_NAME
    )

    expect(rows.map((row) => row.key.text)).toEqual([
      'Name or organisation name',
      'Address line 1',
      'Town or city',
      'Postcode or Zip code',
      'Country',
      'Email address',
      'Phone number'
    ])
  })

  test('treats a whitespace-only optional field as blank', () => {
    const rows = buildRows({ ...mockAddress, addressLine2: '   ' }, UK_NAME)

    expect(rows.map((row) => row.key.text)).not.toContain(
      'Address line 2 (optional)'
    )
  })

  test('renders each Standard Address Block field on its own row, labelled as on the edit form, county and line 2 marked optional', () => {
    const rows = buildRows(mockAddress, UK_NAME)

    expect(rows.map((row) => row.key.text)).toEqual([
      'Name or organisation name',
      'Address line 1',
      'Address line 2 (optional)',
      'Town or city',
      'County (optional)',
      'Postcode or Zip code',
      'Country',
      'Email address',
      'Phone number'
    ])
    expect(rows.map((row) => row.value.text)).toEqual([
      BUSINESS_NAME,
      "14 Drover's Way",
      'Unit 2',
      'Inverness',
      'Highland',
      'IV2 3JH',
      UK_NAME,
      EMAIL,
      '+44 1463 234567'
    ])
  })
})

const countries = [
  { code: 'GB', name: UK_NAME },
  { code: 'FR', name: 'France' }
]

describe('#addressBookViewController', () => {
  const server = startRealModeServerServingCountries(countries)

  test('GET renders read-only address details with Edit and Delete actions', async () => {
    const scope = addressBookApi()
      .get(ADDRESS_PATH)
      .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
      .reply(200, mockAddress)

    const { result, statusCode } = await server().inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    expect(result).toContain(BUSINESS_NAME)
    expect(result).toContain('14 Drover&#39;s Way')
    expect(result).toContain('Inverness')
    expect(result).toContain('IV2 3JH')
    expect(result).not.toContain(
      '14 Drover&#39;s Way, Unit 2, Inverness, Highland, IV2 3JH'
    )
    expect(result).toContain(UK_NAME)
    expect(result).not.toContain('>GB<')
    expect(result).toContain(EMAIL)
    expect(result).toContain(`/address-book/${addressId}/edit`)
    expect(result).toContain(`/address-book/${addressId}/delete`)
    expect(result).not.toContain('operator')
    expect(result).not.toContain('Type')

    const $ = load(result)
    const group = $('.govuk-button-group')
    expect(
      group.find(`a[href="/address-book/${addressId}/edit"]`)
    ).toHaveLength(1)
    expect(
      group.find(`a[href="/address-book/${addressId}/delete"]`)
    ).toHaveLength(1)
    expect(
      group
        .find(`a[href="/address-book/${addressId}/edit"]`)
        .hasClass('govuk-button--secondary')
    ).toBe(true)
    expect(
      group
        .find(`a[href="/address-book/${addressId}/delete"]`)
        .hasClass('govuk-button--warning')
    ).toBe(true)
    expect($('head > title').text().replace(/\s+/g, ' ').trim()).toBe(
      'Highland Livestock Ltd - Import notification service - GOV.UK'
    )
  })

  test('GET redirects to the address book when the address is not found', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await server().inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-not-found')
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test("GET redirects to the address book for another organisation's address", async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
      .reply(404, { message: 'Not found' })

    const { headers, statusCode } = await server().inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-other-org')
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('GET redirects to the address book for a malformed address id without reaching the address book', async () => {
    const { headers, statusCode } = await server().inject({
      method: 'GET',
      url: '/address-book/not-a-valid-id',
      auth: sessionAuth('view-bad-id')
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('GET redirects to the address book for soft-deleted tombstones', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { headers, statusCode } = await server().inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-get-tombstone')
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })
})

describe('#addressBookViewController with a return', () => {
  const server = startRealModeServerServingCountries(countries)

  test('GET with an INS return links Back to it and carries it on Edit and Delete', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result, statusCode } = await server().inject({
      method: 'GET',
      url: `/address-book/${addressId}?return=%2F`,
      auth: sessionAuth('view-return-ins')
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($(BACK_LINK).attr('href')).toBe('/')
    const group = $('.govuk-button-group')
    expect(
      group.find(`a[href="/address-book/${addressId}/edit?return=%2F"]`)
    ).toHaveLength(1)
    expect(
      group.find(`a[href="/address-book/${addressId}/delete?return=%2F"]`)
    ).toHaveLength(1)
  })

  test("GET with a return to the address's own page points Back at the address book", async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    const ownPage = `/address-book/${addressId}`

    const { result, statusCode } = await server().inject({
      method: 'GET',
      url: `${ownPage}?return=${encodeURIComponent(ownPage)}`,
      auth: sessionAuth('view-return-own-page')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)(BACK_LINK).attr('href')).toBe(ADDRESS_BOOK_PATH)
  })

  test('GET honours a return on the animals frontend origin', async () => {
    const animalsUrl = `${new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin}/live-animals/notifications/abc`
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result, statusCode } = await server().inject({
      method: 'GET',
      url: `/address-book/${addressId}?return=${encodeURIComponent(animalsUrl)}`,
      auth: sessionAuth('view-return-animals')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)(BACK_LINK).attr('href')).toBe(animalsUrl)
  })

  test('GET ignores a return on another origin', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result, statusCode } = await server().inject({
      method: 'GET',
      url: `/address-book/${addressId}?return=https%3A%2F%2Fevil.example%2F`,
      auth: sessionAuth('view-return-other-origin')
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($(BACK_LINK).attr('href')).toBe(ADDRESS_BOOK_PATH)
    expect(result).not.toContain('?return')
  })

  test('GET for a not-found address with an honoured return redirects to it', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await server().inject({
      method: 'GET',
      url: `/address-book/${addressId}?return=%2F`,
      auth: sessionAuth('view-return-not-found')
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe('/')
  })

  test('GET for a malformed id with an honoured return redirects to it', async () => {
    const { headers, statusCode } = await server().inject({
      method: 'GET',
      url: '/address-book/not-a-valid-id?return=%2F',
      auth: sessionAuth('view-return-bad-id')
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe('/')
  })

  test.each([
    ['%2F%E2%82%AC', '/%E2%82%AC'],
    ['%2Fa%00b', '/a%00b']
  ])(
    'GET for a malformed id with a return of %s redirects to it percent-encoded',
    async (encoded, location) => {
      const { headers, statusCode } = await server().inject({
        method: 'GET',
        url: `/address-book/not-a-valid-id?return=${encoded}`,
        auth: sessionAuth('view-return-encoded')
      })

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe(location)
    }
  )

  test('GET returns 500 when the address book cannot be reached', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode } = await server().inject({
      method: 'GET',
      url: `/address-book/${addressId}`,
      auth: sessionAuth('view-get-500')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong')
  })
})
