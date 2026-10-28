import { load } from 'cheerio'
import { describe, expect, test, vi } from 'vitest'

import { config } from '../../../../../config/config.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  ADDRESS_BOOK_PATH,
  ADDRESS_ID,
  addressApiPath,
  addressPagePath,
  BACK_LINK,
  COUNTRIES,
  deleteAddressPagePath,
  editAddressPagePath,
  expectRedirectTo,
  expectServerErrorPage,
  getPage,
  getPageAsOtherOrganisation,
  MALFORMED_ADDRESS_ID,
  ORGANISATION_ID_HEADER,
  RETURN_HOME,
  serveAddressBookServerError,
  serveAddressNotFound,
  serveAddressNotFoundForOtherOrganisation,
  serveStoredAddress,
  STORED_ADDRESS
} from '../../../../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import { buildRows } from './view.controller.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const UK_NAME = 'United Kingdom'
const INS_HOME = '/'

const ADDRESS_LINE_2_LABEL = 'Address line 2 (optional)'
const COUNTY_LABEL = 'County (optional)'

const STORED_ADDRESS_ROW_LABELS = [
  'Name or organisation',
  'Address line 1',
  ADDRESS_LINE_2_LABEL,
  'Town or city',
  COUNTY_LABEL,
  'Postcode or Zip code',
  'Country',
  'Email address',
  'Phone number'
]

const STORED_ADDRESS_ROW_VALUES = [
  STORED_ADDRESS.name,
  STORED_ADDRESS.addressLine1,
  STORED_ADDRESS.addressLine2,
  STORED_ADDRESS.townOrCity,
  STORED_ADDRESS.county,
  STORED_ADDRESS.postcode,
  UK_NAME,
  STORED_ADDRESS.email,
  STORED_ADDRESS.phone
]

describe('#buildRows', () => {
  test('Should leave out address line 2 and county when the address has neither', () => {
    const rows = buildRows(
      { ...STORED_ADDRESS, addressLine2: '', county: null },
      UK_NAME
    )

    expect(rows.map((row) => row.key.text)).toEqual(
      STORED_ADDRESS_ROW_LABELS.filter(
        (label) =>
          label !== ADDRESS_LINE_2_LABEL &&
          label !== COUNTY_LABEL
      )
    )
  })

  test('Should treat a whitespace-only optional field as blank', () => {
    const rows = buildRows({ ...STORED_ADDRESS, addressLine2: '   ' }, UK_NAME)

    expect(rows.map((row) => row.key.text)).toEqual(
      STORED_ADDRESS_ROW_LABELS.filter(
        (label) => label !== ADDRESS_LINE_2_LABEL
      )
    )
  })

  test('Should render one row per address field with its label and value, address line 2 and county marked optional', () => {
    const rows = buildRows(STORED_ADDRESS, UK_NAME)

    expect(rows.map((row) => row.key.text)).toEqual(STORED_ADDRESS_ROW_LABELS)
    expect(rows.map((row) => row.value.text)).toEqual(STORED_ADDRESS_ROW_VALUES)
  })
})

describe('GET /address-book/{addressId}', () => {
  const server = startRealModeServerServingCountries(COUNTRIES)

  test("Should show the signed-in organisation's address field by field with the country by name", async () => {
    const scope = addressBookApi()
      .get(addressApiPath(ADDRESS_ID))
      .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
      .reply(statusCodes.ok, STORED_ADDRESS)

    const { result, statusCode } = await getPage(
      server(),
      addressPagePath(ADDRESS_ID),
      'view-get'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    const $ = load(result)
    const textsOf = (selector) =>
      $(selector)
        .map((_, element) => $(element).text().trim())
        .get()
    expect(textsOf('.govuk-summary-list__key')).toEqual(
      STORED_ADDRESS_ROW_LABELS
    )
    expect(textsOf('.govuk-summary-list__value')).toEqual(
      STORED_ADDRESS_ROW_VALUES
    )
  })

  test('Should show Edit as a secondary button and Delete as a warning button in the button group', async () => {
    serveStoredAddress()

    const { result } = await getPage(
      server(),
      addressPagePath(ADDRESS_ID),
      'view-get-buttons'
    )

    const group = load(result)('.govuk-button-group')
    const editLink = group.find(`a[href="${editAddressPagePath(ADDRESS_ID)}"]`)
    const deleteLink = group.find(
      `a[href="${deleteAddressPagePath(ADDRESS_ID)}"]`
    )
    expect(editLink).toHaveLength(1)
    expect(editLink.hasClass('govuk-button--secondary')).toBe(true)
    expect(deleteLink).toHaveLength(1)
    expect(deleteLink.hasClass('govuk-button--warning')).toBe(true)
  })

  test('Should title the page with the address name', async () => {
    serveStoredAddress()

    const { result } = await getPage(
      server(),
      addressPagePath(ADDRESS_ID),
      'view-get-title'
    )

    expect(
      load(result)('head > title').text().replace(/\s+/g, ' ').trim()
    ).toBe(`${STORED_ADDRESS.name} - Import notification service - GOV.UK`)
  })

  test('Should redirect to the address book when the address is not found', async () => {
    serveAddressNotFound(ADDRESS_ID)

    expectRedirectTo(
      await getPage(server(), addressPagePath(ADDRESS_ID), 'view-not-found'),
      ADDRESS_BOOK_PATH
    )
  })

  test("Should redirect to the address book for another organisation's address", async () => {
    const scope = serveAddressNotFoundForOtherOrganisation(ADDRESS_ID)

    const response = await getPageAsOtherOrganisation(
      server(),
      addressPagePath(ADDRESS_ID),
      'view-other-org'
    )

    expect(scope.isDone()).toBe(true)
    expectRedirectTo(response, ADDRESS_BOOK_PATH)
  })

  test('Should redirect to the address book for a malformed address id without reaching the address book', async () => {
    const response = await getPage(
      server(),
      addressPagePath(MALFORMED_ADDRESS_ID),
      'view-bad-id'
    )

    expectRedirectTo(response, ADDRESS_BOOK_PATH)
  })

  test('Should redirect to the address book for soft-deleted tombstones', async () => {
    serveStoredAddress({ ...STORED_ADDRESS, deleted: true })

    expectRedirectTo(
      await getPage(
        server(),
        addressPagePath(ADDRESS_ID),
        'view-get-tombstone'
      ),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should return 500 when the address book cannot be reached', async () => {
    serveAddressBookServerError(addressApiPath(ADDRESS_ID))

    expectServerErrorPage(
      await getPage(server(), addressPagePath(ADDRESS_ID), 'view-get-500')
    )
  })
})

describe('GET /address-book/{addressId} with a return', () => {
  const server = startRealModeServerServingCountries(COUNTRIES)

  test('Should link Back to an INS return and carry it on Edit and Delete', async () => {
    serveStoredAddress()

    const { result, statusCode } = await getPage(
      server(),
      `${addressPagePath(ADDRESS_ID)}${RETURN_HOME}`,
      'view-return-ins'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($(BACK_LINK).attr('href')).toBe(INS_HOME)
    const group = $('.govuk-button-group')
    expect(
      group.find(`a[href="${editAddressPagePath(ADDRESS_ID)}${RETURN_HOME}"]`)
    ).toHaveLength(1)
    expect(
      group.find(`a[href="${deleteAddressPagePath(ADDRESS_ID)}${RETURN_HOME}"]`)
    ).toHaveLength(1)
  })

  test("Should point Back at the address book for a return to the address's own page", async () => {
    serveStoredAddress()

    const { result, statusCode } = await getPage(
      server(),
      `${addressPagePath(ADDRESS_ID)}?return=${encodeURIComponent(addressPagePath(ADDRESS_ID))}`,
      'view-return-own-page'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)(BACK_LINK).attr('href')).toBe(ADDRESS_BOOK_PATH)
  })

  test('Should link Back to a return on the animals frontend origin', async () => {
    const animalsUrl = `${new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin}/live-animals/notifications/abc`
    serveStoredAddress()

    const { result, statusCode } = await getPage(
      server(),
      `${addressPagePath(ADDRESS_ID)}?return=${encodeURIComponent(animalsUrl)}`,
      'view-return-animals'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)(BACK_LINK).attr('href')).toBe(animalsUrl)
  })

  test('Should point Back at the address book and carry no return for a return on another origin', async () => {
    serveStoredAddress()

    const { result, statusCode } = await getPage(
      server(),
      `${addressPagePath(ADDRESS_ID)}?return=https%3A%2F%2Fevil.example%2F`,
      'view-return-other-origin'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($(BACK_LINK).attr('href')).toBe(ADDRESS_BOOK_PATH)
    expect(result).not.toContain('?return')
  })

  test('Should redirect to an honoured return when the address is not found', async () => {
    serveAddressNotFound(ADDRESS_ID)

    expectRedirectTo(
      await getPage(
        server(),
        `${addressPagePath(ADDRESS_ID)}${RETURN_HOME}`,
        'view-return-not-found'
      ),
      INS_HOME
    )
  })

  test('Should redirect to an honoured return for a malformed address id', async () => {
    expectRedirectTo(
      await getPage(
        server(),
        `${addressPagePath(MALFORMED_ADDRESS_ID)}${RETURN_HOME}`,
        'view-return-bad-id'
      ),
      INS_HOME
    )
  })

  test.each([
    ['%2F%E2%82%AC', '/%E2%82%AC'],
    ['%2Fa%00b', '/a%00b']
  ])(
    'Should redirect a malformed address id to a return of %s percent-encoded as %s',
    async (encoded, location) => {
      expectRedirectTo(
        await getPage(
          server(),
          `${addressPagePath(MALFORMED_ADDRESS_ID)}?return=${encoded}`,
          'view-return-encoded'
        ),
        location
      )
    }
  )
})
