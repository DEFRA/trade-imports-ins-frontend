import { load } from 'cheerio'
import { describe, expect, test } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressBookPath,
  COUNTRIES,
  cookieAfterChoosingTransporterType,
  cookieHeaderOf,
  expectRedirectTo,
  getPage,
  interceptAddressBookRequest,
  postPage,
  privateTransporterPath,
  serveTransporterCreationCapturingBody,
  serveTransporterCreationUnavailable,
  serveTransporterRefused,
  transporterTypePath
} from '../../../../common/test-helpers/address-book-requests.js'
import {
  textOf,
  textsOf
} from '../../../../common/test-helpers/rendered-text.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'

const CAPTION = '.govuk-caption-l'
const FORM_LABEL_SELECTOR = 'form label'
const ERROR_SUMMARY_LINKS = '.govuk-error-summary a'
const CANCEL_LINK = 'form a.govuk-link'

const TRANSPORTER_LIST_PATH = `${addressBookPath()}?addressType=TRANSPORTER`

const VALID_PAYLOAD = {
  name: 'Highland Haulage Ltd',
  addressLine1: "14 Drover's Way",
  addressLine2: '',
  townOrCity: 'Inverness',
  county: '',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  email: 'haulage@highland.example.com',
  phone: '+44 1463 234567'
}

const getWithPrivateTypeChosen = async (server, sessionId) => {
  const cookie = await cookieAfterChoosingTransporterType(server, sessionId, {
    transporterType: 'PRIVATE'
  })
  return getPage(server, privateTransporterPath(), sessionId, cookie)
}

const postWithPrivateTypeChosen = async (server, sessionId, payload) => {
  const cookie = await cookieAfterChoosingTransporterType(server, sessionId, {
    transporterType: 'PRIVATE'
  })
  return postPage(server, privateTransporterPath(), sessionId, payload, cookie)
}

describe('#privateTransporterController', { concurrent: false }, () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  test('GET without a transporter type chosen returns to the transporter type question', async () => {
    const response = await getPage(
      getServer(),
      privateTransporterPath(),
      'private-no-type'
    )

    expectRedirectTo(response, transporterTypePath())
  })

  test('GET with the type chosen shows the form fields, title and Cancel reading the address-book cancel label', async () => {
    const { result, statusCode } = await getWithPrivateTypeChosen(
      getServer(),
      'private-get'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect(textsOf($, 'h1')).toEqual(['Add a private transporter'])
    expect(textsOf($, CAPTION)).toEqual(['Add a new transporter'])
    expect(textsOf($, FORM_LABEL_SELECTOR)).toEqual([
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
    expect(textOf($, CANCEL_LINK)).toBe('Cancel and return to address book')
  })

  test('Cancel reads the address-book cancel label and goes to the address book filtered to transporters', async () => {
    const { result } = await getWithPrivateTypeChosen(
      getServer(),
      'private-cancel'
    )

    const $ = load(result)
    expect(textOf($, CANCEL_LINK)).toBe('Cancel and return to address book')
    expect($(CANCEL_LINK).attr('href')).toBe(TRANSPORTER_LIST_PATH)
  })

  test('POST with invalid fields shows the errors and makes no create call', async () => {
    const { expectNotSent } = interceptAddressBookRequest(
      'POST',
      '/organisation/5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88/transporters'
    )

    const { result, statusCode } = await postWithPrivateTypeChosen(
      getServer(),
      'private-invalid',
      { ...VALID_PAYLOAD, name: '' }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(textsOf(load(result), ERROR_SUMMARY_LINKS)).toContain(
      'Enter a name or organisation'
    )
    expectNotSent()
  })

  test('A valid save sends exactly the posted fields as the transporter body, with type PRIVATE, and lands on the address book filtered to transporters with the success banner set', async () => {
    const { scope, captured } = serveTransporterCreationCapturingBody()

    const response = await postWithPrivateTypeChosen(
      getServer(),
      'private-save',
      VALID_PAYLOAD
    )

    expectRedirectTo(response, TRANSPORTER_LIST_PATH)
    expect(scope.isDone()).toBe(true)
    expect(captured.body).toMatchObject({ ...VALID_PAYLOAD, type: 'PRIVATE' })

    const listCookie = cookieHeaderOf(response.headers)
    const { result } = await getPage(
      getServer(),
      TRANSPORTER_LIST_PATH,
      'private-save',
      listCookie
    )
    expect(result).toContain('Success')
  })

  test('A refused save shows the API messages against the fields', async () => {
    serveTransporterRefused({ postcode: ['Postcode is not recognised'] })

    const { result, statusCode } = await postWithPrivateTypeChosen(
      getServer(),
      'private-refused',
      VALID_PAYLOAD
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(textsOf(load(result), ERROR_SUMMARY_LINKS)).toContain(
      'Postcode is not recognised'
    )
  })

  test('An upstream failure shows the recoverable banner with a server error', async () => {
    serveTransporterCreationUnavailable()

    const { statusCode } = await postWithPrivateTypeChosen(
      getServer(),
      'private-unavailable',
      VALID_PAYLOAD
    )

    expect(statusCode).toBe(statusCodes.internalServerError)
  })
})
