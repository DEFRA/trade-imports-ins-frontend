import { load } from 'cheerio'
import { describe, expect, test, vi } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  ADDRESSES_PATH,
  expectRedirectTo,
  expectServerErrorPage,
  getPage,
  getPageAsOtherOrganisation,
  INVALID_ADDRESS_PAYLOAD,
  MALFORMED_ADDRESS_ID,
  postPage,
  serveAddressBookServerError,
  serveAddressNotFoundForOtherOrganisation
} from '../../../../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { expectAddressFormWidths } from '../../../../common/test-helpers/expect-address-form-widths.js'
import { expectSummaryLinks } from '../../../../common/test-helpers/expect-address-summary-links.js'
import { openEmptyAddressBookWithCookiesFrom } from '../../../../common/test-helpers/open-empty-address-book-with-cookies.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'
const ADDRESS_PATH = `${ADDRESSES_PATH}/${ADDRESS_ID}`
const EDIT_URL = `/address-book/${ADDRESS_ID}/edit`
const VIEW_PATH = `/address-book/${ADDRESS_ID}`
const ADDRESS_BOOK_PATH = '/address-book'
const RETURN_HOME = '?return=%2F'
const BACK_LINK = 'a.govuk-back-link'
const COUNTRY_OPTIONS = '#countryCode option'
const UPDATED_NAME = 'Updated Farm Ltd'
const UNOFFERED_COUNTRY_CODE = 'XX'
const STORED_NAME = 'Highland Livestock Ltd'
const COUNTRY_PLACEHOLDER = 'Select a country'
const RECOVERABLE_ERROR_MESSAGE =
  'Sorry, there is a problem with the service. Try again in a few minutes.'

const mockCountries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'DE', name: 'Germany' }
]

const mockAddress = {
  id: ADDRESS_ID,
  name: STORED_NAME,
  addressLine1: "14 Drover's Way",
  addressLine2: 'Unit 2',
  townOrCity: 'Inverness',
  county: 'Highland',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com',
  deleted: false
}

const validPayload = {
  name: STORED_NAME,
  addressLine1: "14 Drover's Way",
  addressLine2: '',
  townOrCity: 'Inverness',
  county: '',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com'
}

const serveLiveAddress = (address = mockAddress) =>
  addressBookApi().get(ADDRESS_PATH).reply(200, address)

const serveNoAddress = () =>
  addressBookApi().get(ADDRESS_PATH).reply(404, { message: 'Not found' })

const getEdit = (server, sessionId, query = '') =>
  getPage(server, `${EDIT_URL}${query}`, sessionId)

const postEdit = (server, sessionId, payload, query = '') =>
  postPage(server, `${EDIT_URL}${query}`, sessionId, payload)

const countryValuesOf = ($) =>
  $(COUNTRY_OPTIONS)
    .map((_, option) => $(option).attr('value'))
    .get()

describe('GET /address-book/{addressId}/edit', () => {
  const server = startRealModeServerServingCountries(mockCountries)

  test('Should head the page and title the browser Edit address and contact details', async () => {
    serveLiveAddress()

    const { result, statusCode } = await getEdit(server(), 'edit-get-title')

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('h1').text().trim()).toBe('Edit address and contact details')
    expect($('head > title').text().replace(/\s+/g, ' ').trim()).toBe(
      'Edit address and contact details - Import notification service - GOV.UK'
    )
  })

  test('Should ask for exactly the nine address fields in the add form order, prefilled, under the Address and Contact details headings', async () => {
    serveLiveAddress()

    const { result } = await getEdit(server(), 'edit-get-labels')

    const $ = load(result)
    expect(
      $('form h2')
        .map((_, heading) => $(heading).text().trim())
        .get()
    ).toEqual(['Address', 'Contact details'])
    expect(
      $('form label')
        .map((_, label) => $(label).text().trim())
        .get()
    ).toEqual([
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
    expect($('#name').val()).toBe(STORED_NAME)
    expect($('#addressLine2').val()).toBe('Unit 2')
  })

  test('Should lay out the fields at the add form widths', async () => {
    serveLiveAddress()

    const { result } = await getEdit(server(), 'edit-get-widths')

    expectAddressFormWidths(result)
  })

  test('Should offer exactly the countries by name with no blank option and the stored country selected', async () => {
    serveLiveAddress({ ...mockAddress, countryCode: 'FR' })

    const { result } = await getEdit(server(), 'edit-get-country-offered')

    const $ = load(result)
    expect(countryValuesOf($)).toEqual(['FR', 'DE', 'CH', 'GB'])
    expect(
      $(COUNTRY_OPTIONS)
        .map((_, option) => $(option).text().trim())
        .get()
    ).toEqual(['France', 'Germany', 'Switzerland', 'United Kingdom'])
    expect($('#countryCode option[selected]').attr('value')).toBe('FR')
  })

  test('Should open on one blank option with no country selected when the stored country is not offered', async () => {
    serveLiveAddress({ ...mockAddress, countryCode: UNOFFERED_COUNTRY_CODE })

    const { result } = await getEdit(server(), 'edit-get-country-unoffered')

    const $ = load(result)
    expect(countryValuesOf($)).toEqual(['', 'FR', 'DE', 'CH', 'GB'])
    expect($(COUNTRY_OPTIONS).first().text().trim()).toBe(COUNTRY_PLACEHOLDER)
    expect($('#countryCode option[selected]')).toHaveLength(0)
  })

  test('Should link Back to the address view page when the edit was opened with no return', async () => {
    serveLiveAddress()

    const { result } = await getEdit(server(), 'edit-get-back-default')

    expect(load(result)(BACK_LINK).attr('href')).toBe(VIEW_PATH)
  })

  test('Should link Back to the page the edit was opened from', async () => {
    serveLiveAddress()

    const { result } = await getEdit(
      server(),
      'edit-get-back-return',
      RETURN_HOME
    )

    expect(load(result)(BACK_LINK).attr('href')).toBe('/')
  })

  test('Should redirect to the address book when the address is unknown', async () => {
    serveNoAddress()

    expectRedirectTo(
      await getEdit(server(), 'edit-get-unknown'),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should redirect to the address book when the address was deleted', async () => {
    serveLiveAddress({ ...mockAddress, deleted: true })

    expectRedirectTo(
      await getEdit(server(), 'edit-get-deleted'),
      ADDRESS_BOOK_PATH
    )
  })

  test("Should redirect to the address book for another organisation's address", async () => {
    const scope = serveAddressNotFoundForOtherOrganisation(ADDRESS_ID)

    const response = await getPageAsOtherOrganisation(
      server(),
      EDIT_URL,
      'edit-get-other-organisation'
    )

    expect(scope.isDone()).toBe(true)
    expectRedirectTo(response, ADDRESS_BOOK_PATH)
  })

  test('Should redirect to the address book for a malformed address id without reaching the address book', async () => {
    const response = await getPage(
      server(),
      `/address-book/${MALFORMED_ADDRESS_ID}/edit`,
      'edit-get-malformed'
    )

    expectRedirectTo(response, ADDRESS_BOOK_PATH)
  })

  test('Should redirect to the page the edit was opened from when the address is unknown', async () => {
    serveNoAddress()

    expectRedirectTo(
      await getEdit(server(), 'edit-get-unknown-return', RETURN_HOME),
      '/'
    )
  })

  test("Should redirect to the address book when the address is unknown and the return is the address's own page", async () => {
    serveNoAddress()

    expectRedirectTo(
      await getEdit(
        server(),
        'edit-get-unknown-own-page',
        `?return=${encodeURIComponent(VIEW_PATH)}`
      ),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should return 500 when the address book cannot be reached', async () => {
    serveAddressBookServerError(ADDRESS_PATH)

    expectServerErrorPage(await getEdit(server(), 'edit-get-500'))
  })
})

describe('POST /address-book/{addressId}/edit', () => {
  const server = startRealModeServerServingCountries(mockCountries)

  test('Should send the whole edited address to the address book and redirect to the address book', async () => {
    serveLiveAddress()
    let sent
    const scope = addressBookApi()
      .put(ADDRESS_PATH, (body) => {
        sent = body
        return true
      })
      .reply(200, { ...mockAddress, name: UPDATED_NAME })

    const { statusCode, headers } = await postEdit(
      server(),
      'edit-post-success',
      { ...validPayload, name: UPDATED_NAME }
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
    expect(scope.isDone()).toBe(true)
    expect(sent).toEqual({ ...validPayload, name: UPDATED_NAME })
  })

  test('Should show the address book banner naming the address as the address book returns it', async () => {
    serveLiveAddress()
    addressBookApi()
      .put(ADDRESS_PATH)
      .reply(200, { ...mockAddress, name: 'GREEN VALLEY FARM' })

    const { headers } = await postEdit(server(), 'edit-post-banner', {
      ...validPayload,
      name: 'green valley farm'
    })

    const listResponse = await openEmptyAddressBookWithCookiesFrom(
      server(),
      'edit-post-banner',
      headers
    )
    expect(
      load(listResponse.result)('.govuk-notification-banner').text()
    ).toContain('GREEN VALLEY FARM address updated')
  })

  test('Should re-render the form with the posted values and the summary links when the data is invalid', async () => {
    serveLiveAddress()

    const { result, statusCode } = await postEdit(
      server(),
      'edit-post-invalid',
      INVALID_ADDRESS_PAYLOAD
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('There is a problem')
    expectSummaryLinks(result)
    expect(result).toContain('href="#email"')
    expect(result).toContain('Enter an email address in the correct format')
    expect(result).toContain('govuk-error-message')
    expect(load(result)('head > title').text()).toContain(
      'Error: Edit address and contact details'
    )
  })

  test('Should refuse a country the reference data does not list with Select a country, sending nothing', async () => {
    const scope = serveLiveAddress()

    const { result, statusCode } = await postEdit(
      server(),
      'edit-post-country-unoffered',
      { ...validPayload, countryCode: UNOFFERED_COUNTRY_CODE }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(scope.isDone()).toBe(true)
    const $ = load(result)
    expect($('.govuk-error-summary a[href="#countryCode"]').text().trim()).toBe(
      COUNTRY_PLACEHOLDER
    )
    expect($('#countryCode-error').text()).toContain(COUNTRY_PLACEHOLDER)
    expect(countryValuesOf($)).toEqual(['', 'FR', 'DE', 'CH', 'GB'])
  })

  test('Should redirect to the address book and send nothing when the address is not live', async () => {
    serveNoAddress()

    expectRedirectTo(
      await postEdit(server(), 'edit-post-not-live', validPayload),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should redirect to the page the edit was opened from when the address is not live', async () => {
    serveNoAddress()

    expectRedirectTo(
      await postEdit(
        server(),
        'edit-post-not-live-return',
        validPayload,
        RETURN_HOME
      ),
      '/'
    )
  })

  test('Should redirect to the address book when the address is deleted between the read and the update', async () => {
    serveLiveAddress()
    addressBookApi().put(ADDRESS_PATH).reply(404, { message: 'Not found' })

    expectRedirectTo(
      await postEdit(server(), 'edit-post-update-404', validPayload),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should show the recoverable-error banner and keep the posted values when the address book rejects the update with a server error', async () => {
    serveLiveAddress()
    addressBookApi()
      .put(ADDRESS_PATH)
      .reply(statusCodes.serviceUnavailable, { title: 'Service Unavailable' })

    const { result, statusCode } = await postEdit(
      server(),
      'edit-post-500',
      validPayload
    )

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('govuk-notification-banner')
    expect(result).toContain(RECOVERABLE_ERROR_MESSAGE)
    expect(result).toContain(`value="${STORED_NAME}"`)
  })

  test('Should show the recoverable-error banner, keep the posted values and send nothing when the live read fails with a server error', async () => {
    serveAddressBookServerError(ADDRESS_PATH)

    const { result, statusCode } = await postEdit(
      server(),
      'edit-post-live-read-500',
      validPayload
    )

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain(RECOVERABLE_ERROR_MESSAGE)
    expect(result).toContain(`value="${STORED_NAME}"`)
  })

  test('Should go to the view page on Cancel with no return, sending nothing', async () => {
    expectRedirectTo(
      await postEdit(server(), 'edit-post-cancel', { cancel: 'true' }),
      VIEW_PATH
    )
  })

  test('Should go to the page the edit was opened from on Cancel, sending nothing', async () => {
    expectRedirectTo(
      await postEdit(
        server(),
        'edit-post-cancel-return',
        { cancel: 'true' },
        RETURN_HOME
      ),
      '/'
    )
  })
})
