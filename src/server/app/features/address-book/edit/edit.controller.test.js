import { load } from 'cheerio'
import { describe, expect, test, vi } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  ADDRESS_BOOK_PATH,
  ADDRESS_ID,
  addressApiPath,
  addressPagePath,
  BACK_LINK,
  COUNTRIES,
  COUNTRY_OPTIONS,
  editAddressPagePath,
  expectRedirectTo,
  expectServerErrorPage,
  getPage,
  getPageAsOtherOrganisation,
  INVALID_ADDRESS_PAYLOAD,
  MALFORMED_ADDRESS_ID,
  postPage,
  RETURN_HOME,
  SELECTED_COUNTRY,
  serveAddressBookServerError,
  serveAddressNotFound,
  serveAddressNotFoundForOtherOrganisation,
  serveStoredAddress,
  STORED_ADDRESS,
  VALID_ADDRESS_PAYLOAD
} from '../../../../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { expectAddressFormAutocomplete } from '../../../../common/test-helpers/expect-address-form-autocomplete.js'
import { expectAddressFormWidths } from '../../../../common/test-helpers/expect-address-form-widths.js'
import { expectSummaryLinks } from '../../../../common/test-helpers/expect-address-summary-links.js'
import { openEmptyAddressBookWithCookiesFrom } from '../../../../common/test-helpers/open-empty-address-book-with-cookies.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const UPDATED_NAME = 'Updated Farm Ltd'
const UNOFFERED_COUNTRY_CODE = 'XX'
const COUNTRY_PLACEHOLDER = 'Select a country'
const RECOVERABLE_ERROR_MESSAGE =
  'Sorry, there is a problem with the service. Try again in a few minutes.'

const getEdit = (server, sessionId, query = '') =>
  getPage(server, `${editAddressPagePath(ADDRESS_ID)}${query}`, sessionId)

const postEdit = (server, sessionId, payload, query = '') =>
  postPage(
    server,
    `${editAddressPagePath(ADDRESS_ID)}${query}`,
    sessionId,
    payload
  )

const countryValuesOf = ($) =>
  $(COUNTRY_OPTIONS)
    .map((_, option) => $(option).attr('value'))
    .get()

describe('GET /address-book/{addressId}/edit', () => {
  const server = startRealModeServerServingCountries(COUNTRIES)

  test('Should head the page and title the browser Edit address and contact details', async () => {
    serveStoredAddress()

    const { result, statusCode } = await getEdit(server(), 'edit-get-title')

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('h1').text().trim()).toBe('Edit address and contact details')
    expect($('head > title').text().replace(/\s+/g, ' ').trim()).toBe(
      'Edit address and contact details - Import notification service - GOV.UK'
    )
  })

  test('Should ask for exactly the nine address fields in the add form order, prefilled, under the Address and Contact details headings', async () => {
    serveStoredAddress()

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
    expect({
      name: $('#name').val(),
      addressLine1: $('#addressLine1').val(),
      addressLine2: $('#addressLine2').val(),
      townOrCity: $('#townOrCity').val(),
      county: $('#county').val(),
      postcode: $('#postcode').val(),
      countryCode: $(SELECTED_COUNTRY).attr('value'),
      email: $('#email').val(),
      phone: $('#phone').val()
    }).toEqual({
      name: STORED_ADDRESS.name,
      addressLine1: STORED_ADDRESS.addressLine1,
      addressLine2: STORED_ADDRESS.addressLine2,
      townOrCity: STORED_ADDRESS.townOrCity,
      county: STORED_ADDRESS.county,
      postcode: STORED_ADDRESS.postcode,
      countryCode: STORED_ADDRESS.countryCode,
      email: STORED_ADDRESS.email,
      phone: STORED_ADDRESS.phone
    })
  })

  test('Should lay out the fields at the add form widths', async () => {
    serveStoredAddress()

    const { result } = await getEdit(server(), 'edit-get-widths')

    expectAddressFormWidths(result)
  })

  test('Should give each personal-data field its browser autocomplete hint and none to County or Country', async () => {
    serveStoredAddress()

    const { result } = await getEdit(server(), 'edit-get-autocomplete')

    expectAddressFormAutocomplete(result)
  })

  test('Should offer exactly the countries by name with no blank option and the stored country selected', async () => {
    serveStoredAddress({ ...STORED_ADDRESS, countryCode: 'FR' })

    const { result } = await getEdit(server(), 'edit-get-country-offered')

    const $ = load(result)
    expect(countryValuesOf($)).toEqual(['FR', 'DE', 'CH', 'GB'])
    expect(
      $(COUNTRY_OPTIONS)
        .map((_, option) => $(option).text().trim())
        .get()
    ).toEqual(['France', 'Germany', 'Switzerland', 'United Kingdom'])
    expect($(SELECTED_COUNTRY).attr('value')).toBe('FR')
  })

  test('Should open on one blank option with no country selected when the stored country is not offered', async () => {
    serveStoredAddress({
      ...STORED_ADDRESS,
      countryCode: UNOFFERED_COUNTRY_CODE
    })

    const { result } = await getEdit(server(), 'edit-get-country-unoffered')

    const $ = load(result)
    expect(countryValuesOf($)).toEqual(['', 'FR', 'DE', 'CH', 'GB'])
    expect($(COUNTRY_OPTIONS).first().text().trim()).toBe(COUNTRY_PLACEHOLDER)
    expect($(SELECTED_COUNTRY)).toHaveLength(0)
  })

  test('Should link Back to the address view page when the edit was opened with no return', async () => {
    serveStoredAddress()

    const { result } = await getEdit(server(), 'edit-get-back-default')

    expect(load(result)(BACK_LINK).attr('href')).toBe(
      addressPagePath(ADDRESS_ID)
    )
  })

  test('Should link Back to the page the edit was opened from', async () => {
    serveStoredAddress()

    const { result } = await getEdit(
      server(),
      'edit-get-back-return',
      RETURN_HOME
    )

    expect(load(result)(BACK_LINK).attr('href')).toBe('/')
  })

  test('Should redirect to the address book when the address is unknown', async () => {
    serveAddressNotFound(ADDRESS_ID)

    expectRedirectTo(
      await getEdit(server(), 'edit-get-unknown'),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should redirect to the address book when the address was deleted', async () => {
    serveStoredAddress({ ...STORED_ADDRESS, deleted: true })

    expectRedirectTo(
      await getEdit(server(), 'edit-get-deleted'),
      ADDRESS_BOOK_PATH
    )
  })

  test("Should redirect to the address book for another organisation's address", async () => {
    const scope = serveAddressNotFoundForOtherOrganisation(ADDRESS_ID)

    const response = await getPageAsOtherOrganisation(
      server(),
      editAddressPagePath(ADDRESS_ID),
      'edit-get-other-organisation'
    )

    expect(scope.isDone()).toBe(true)
    expectRedirectTo(response, ADDRESS_BOOK_PATH)
  })

  test('Should redirect to the address book for a malformed address id without reaching the address book', async () => {
    const response = await getPage(
      server(),
      editAddressPagePath(MALFORMED_ADDRESS_ID),
      'edit-get-malformed'
    )

    expectRedirectTo(response, ADDRESS_BOOK_PATH)
  })

  test('Should redirect to the page the edit was opened from when the address is unknown', async () => {
    serveAddressNotFound(ADDRESS_ID)

    expectRedirectTo(
      await getEdit(server(), 'edit-get-unknown-return', RETURN_HOME),
      '/'
    )
  })

  test("Should redirect to the address book when the address is unknown and the return is the address's own page", async () => {
    serveAddressNotFound(ADDRESS_ID)

    expectRedirectTo(
      await getEdit(
        server(),
        'edit-get-unknown-own-page',
        `?return=${encodeURIComponent(addressPagePath(ADDRESS_ID))}`
      ),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should return 500 when the address book cannot be reached', async () => {
    serveAddressBookServerError(addressApiPath(ADDRESS_ID))

    expectServerErrorPage(await getEdit(server(), 'edit-get-500'))
  })
})

describe('POST /address-book/{addressId}/edit', () => {
  const server = startRealModeServerServingCountries(COUNTRIES)

  test('Should send the whole edited address to the address book and redirect to the address book', async () => {
    serveStoredAddress()
    let sent
    const scope = addressBookApi()
      .put(addressApiPath(ADDRESS_ID), (body) => {
        sent = body
        return true
      })
      .reply(200, { ...STORED_ADDRESS, name: UPDATED_NAME })

    const response = await postEdit(server(), 'edit-post-success', {
      ...VALID_ADDRESS_PAYLOAD,
      name: UPDATED_NAME
    })

    expectRedirectTo(response, ADDRESS_BOOK_PATH)
    expect(scope.isDone()).toBe(true)
    expect(sent).toEqual({ ...VALID_ADDRESS_PAYLOAD, name: UPDATED_NAME })
  })

  test('Should show the address book banner naming the address as the address book returns it', async () => {
    serveStoredAddress()
    addressBookApi()
      .put(addressApiPath(ADDRESS_ID))
      .reply(200, { ...STORED_ADDRESS, name: 'GREEN VALLEY FARM' })

    const { headers } = await postEdit(server(), 'edit-post-banner', {
      ...VALID_ADDRESS_PAYLOAD,
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
    serveStoredAddress()

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
    const $ = load(result)
    expect($('head > title').text()).toContain(
      'Error: Edit address and contact details'
    )
    expect($('#email').val()).toBe(INVALID_ADDRESS_PAYLOAD.email)
  })

  test('Should refuse a country the reference data does not list with Select a country, sending nothing', async () => {
    const scope = serveStoredAddress()

    const { result, statusCode } = await postEdit(
      server(),
      'edit-post-country-unoffered',
      { ...VALID_ADDRESS_PAYLOAD, countryCode: UNOFFERED_COUNTRY_CODE }
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
    serveAddressNotFound(ADDRESS_ID)

    expectRedirectTo(
      await postEdit(server(), 'edit-post-not-live', VALID_ADDRESS_PAYLOAD),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should redirect to the page the edit was opened from when the address is not live', async () => {
    serveAddressNotFound(ADDRESS_ID)

    expectRedirectTo(
      await postEdit(
        server(),
        'edit-post-not-live-return',
        VALID_ADDRESS_PAYLOAD,
        RETURN_HOME
      ),
      '/'
    )
  })

  test('Should redirect to the address book when the address is deleted between the read and the update', async () => {
    serveStoredAddress()
    addressBookApi()
      .put(addressApiPath(ADDRESS_ID))
      .reply(404, { message: 'Not found' })

    expectRedirectTo(
      await postEdit(server(), 'edit-post-update-404', VALID_ADDRESS_PAYLOAD),
      ADDRESS_BOOK_PATH
    )
  })

  test('Should show the recoverable-error banner and keep the posted values when the address book rejects the update with a server error', async () => {
    serveStoredAddress()
    addressBookApi()
      .put(addressApiPath(ADDRESS_ID))
      .reply(statusCodes.serviceUnavailable, { title: 'Service Unavailable' })

    const { result, statusCode } = await postEdit(server(), 'edit-post-500', {
      ...VALID_ADDRESS_PAYLOAD,
      name: UPDATED_NAME
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('govuk-notification-banner')
    expect(result).toContain(RECOVERABLE_ERROR_MESSAGE)
    expect(load(result)('#name').val()).toBe(UPDATED_NAME)
  })

  test('Should show the recoverable-error banner, keep the posted values and send nothing when the live read fails with a server error', async () => {
    serveAddressBookServerError(addressApiPath(ADDRESS_ID))

    const { result, statusCode } = await postEdit(
      server(),
      'edit-post-live-read-500',
      VALID_ADDRESS_PAYLOAD
    )

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain(RECOVERABLE_ERROR_MESSAGE)
    expect(result).toContain(`value="${STORED_ADDRESS.name}"`)
  })

  test('Should go to the view page on Cancel with no return, sending nothing', async () => {
    expectRedirectTo(
      await postEdit(server(), 'edit-post-cancel', { cancel: 'true' }),
      addressPagePath(ADDRESS_ID)
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
