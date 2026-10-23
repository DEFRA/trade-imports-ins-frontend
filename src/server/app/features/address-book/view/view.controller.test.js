import { load } from 'cheerio'
import { describe, expect, test, vi } from 'vitest'

import { config } from '../../../../../config/config.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  expectRedirectTo,
  expectServerErrorPage,
  getPage,
  getPageAsOtherOrganisation,
  MALFORMED_ADDRESS_ID,
  ORGANISATION_ID_HEADER,
  serveAddressBookServerError,
  serveAddressNotFoundForOtherOrganisation
} from '../../../../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import { buildRows } from './view.controller.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORGANISATION_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const addressId = '665f1c2ab3e4d51a2c9d0e77'
const ADDRESS_PATH = `/organisation/${ORGANISATION_ID}/addresses/${addressId}`
const BUSINESS_NAME = 'Highland Livestock Ltd'
const EMAIL = 'exports@example.com'
const UK_NAME = 'United Kingdom'
const ADDRESS_BOOK_PATH = '/address-book'
const BACK_LINK = 'a.govuk-back-link'
const INS_HOME = '/'
const INS_HOME_RETURN = encodeURIComponent(INS_HOME)

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
  test('Should leave out address line 2 and county when the address has neither', () => {
    const rows = buildRows(
      { ...mockAddress, addressLine2: '', county: null },
      UK_NAME
    )

    expect(rows.map((row) => row.key.text)).toEqual([
      'Name or organisation',
      'Address line 1',
      'Town or city',
      'Postcode or Zip code',
      'Country',
      'Email address',
      'Phone number'
    ])
  })

  test('Should treat a whitespace-only optional field as blank', () => {
    const rows = buildRows({ ...mockAddress, addressLine2: '   ' }, UK_NAME)

    expect(rows.map((row) => row.key.text)).not.toContain(
      'Address line 2 (optional)'
    )
  })

  test('Should render one row per address field with its label and value, address line 2 and county marked optional', () => {
    const rows = buildRows(mockAddress, UK_NAME)

    expect(rows.map((row) => row.key.text)).toEqual([
      'Name or organisation',
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

describe('GET /address-book/{addressId}', () => {
  const server = startRealModeServerServingCountries(countries)

  test("Should show the signed-in organisation's address field by field with the country by name", async () => {
    const scope = addressBookApi()
      .get(ADDRESS_PATH)
      .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
      .reply(200, mockAddress)

    const { result, statusCode } = await getPage(
      server(),
      `/address-book/${addressId}`,
      'view-get'
    )

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
    expect(result).not.toContain('operator')
    expect(result).not.toContain('Type')
  })

  test('Should show Edit as a secondary button and Delete as a warning button in the button group', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result } = await getPage(
      server(),
      `/address-book/${addressId}`,
      'view-get-buttons'
    )

    const group = load(result)('.govuk-button-group')
    const editLink = group.find(`a[href="/address-book/${addressId}/edit"]`)
    const deleteLink = group.find(`a[href="/address-book/${addressId}/delete"]`)
    expect(editLink).toHaveLength(1)
    expect(editLink.hasClass('govuk-button--secondary')).toBe(true)
    expect(deleteLink).toHaveLength(1)
    expect(deleteLink.hasClass('govuk-button--warning')).toBe(true)
  })

  test('Should title the page with the address name', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result } = await getPage(
      server(),
      `/address-book/${addressId}`,
      'view-get-title'
    )

    expect(
      load(result)('head > title').text().replace(/\s+/g, ' ').trim()
    ).toBe(`${BUSINESS_NAME} - Import notification service - GOV.UK`)
  })

  test('Should redirect to the address book when the address is not found', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await getPage(
      server(),
      `/address-book/${addressId}`,
      'view-not-found'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test("Should redirect to the address book for another organisation's address", async () => {
    const scope = serveAddressNotFoundForOtherOrganisation(addressId)

    const response = await getPageAsOtherOrganisation(
      server(),
      `/address-book/${addressId}`,
      'view-other-org'
    )

    expect(scope.isDone()).toBe(true)
    expectRedirectTo(response, ADDRESS_BOOK_PATH)
  })

  test('Should redirect to the address book for a malformed address id without reaching the address book', async () => {
    const response = await getPage(
      server(),
      `/address-book/${MALFORMED_ADDRESS_ID}`,
      'view-bad-id'
    )

    expectRedirectTo(response, ADDRESS_BOOK_PATH)
  })

  test('Should redirect to the address book for soft-deleted tombstones', async () => {
    addressBookApi()
      .get(ADDRESS_PATH)
      .reply(200, { ...mockAddress, deleted: true })

    const { headers, statusCode } = await getPage(
      server(),
      `/address-book/${addressId}`,
      'view-get-tombstone'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
  })

  test('Should return 500 when the address book cannot be reached', async () => {
    serveAddressBookServerError(ADDRESS_PATH)

    expectServerErrorPage(
      await getPage(server(), `/address-book/${addressId}`, 'view-get-500')
    )
  })
})

describe('GET /address-book/{addressId} with a return', () => {
  const server = startRealModeServerServingCountries(countries)

  test('Should link Back to an INS return and carry it on Edit and Delete', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result, statusCode } = await getPage(
      server(),
      `/address-book/${addressId}?return=${INS_HOME_RETURN}`,
      'view-return-ins'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($(BACK_LINK).attr('href')).toBe(INS_HOME)
    const group = $('.govuk-button-group')
    expect(
      group.find(
        `a[href="/address-book/${addressId}/edit?return=${INS_HOME_RETURN}"]`
      )
    ).toHaveLength(1)
    expect(
      group.find(
        `a[href="/address-book/${addressId}/delete?return=${INS_HOME_RETURN}"]`
      )
    ).toHaveLength(1)
  })

  test("Should point Back at the address book for a return to the address's own page", async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)
    const ownPage = `/address-book/${addressId}`

    const { result, statusCode } = await getPage(
      server(),
      `${ownPage}?return=${encodeURIComponent(ownPage)}`,
      'view-return-own-page'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)(BACK_LINK).attr('href')).toBe(ADDRESS_BOOK_PATH)
  })

  test('Should link Back to a return on the animals frontend origin', async () => {
    const animalsUrl = `${new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin}/live-animals/notifications/abc`
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result, statusCode } = await getPage(
      server(),
      `/address-book/${addressId}?return=${encodeURIComponent(animalsUrl)}`,
      'view-return-animals'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)(BACK_LINK).attr('href')).toBe(animalsUrl)
  })

  test('Should point Back at the address book and carry no return for a return on another origin', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(200, mockAddress)

    const { result, statusCode } = await getPage(
      server(),
      `/address-book/${addressId}?return=https%3A%2F%2Fevil.example%2F`,
      'view-return-other-origin'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($(BACK_LINK).attr('href')).toBe(ADDRESS_BOOK_PATH)
    expect(result).not.toContain('?return')
  })

  test('Should redirect to an honoured return when the address is not found', async () => {
    addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

    const { headers, statusCode } = await getPage(
      server(),
      `/address-book/${addressId}?return=${INS_HOME_RETURN}`,
      'view-return-not-found'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(INS_HOME)
  })

  test('Should redirect to an honoured return for a malformed address id', async () => {
    const { headers, statusCode } = await getPage(
      server(),
      `/address-book/${MALFORMED_ADDRESS_ID}?return=${INS_HOME_RETURN}`,
      'view-return-bad-id'
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(INS_HOME)
  })

  test.each([
    ['%2F%E2%82%AC', '/%E2%82%AC'],
    ['%2Fa%00b', '/a%00b']
  ])(
    'Should redirect a malformed address id to a return of %s percent-encoded as %s',
    async (encoded, location) => {
      const { headers, statusCode } = await getPage(
        server(),
        `/address-book/${MALFORMED_ADDRESS_ID}?return=${encoded}`,
        'view-return-encoded'
      )

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe(location)
    }
  )
})
