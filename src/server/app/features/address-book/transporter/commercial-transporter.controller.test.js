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
  commercialTransporterPath,
  serveTransporterCreationCapturingBody,
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

const VALID_PAYLOAD = {
  name: 'Lough Neagh Livestock Ltd',
  approvalNumber: 'UK/BELF/T2/00104115',
  addressLine1: '4 Quay Road',
  addressLine2: '',
  townOrCity: 'Belfast',
  county: 'County Antrim',
  postcode: 'BT1 3LG',
  countryCode: 'GB-NIR',
  email: 'movements@lough-neagh.example.com',
  phone: '+44 28 9000 0111'
}

const getWithCommercialTypeChosen = async (server, sessionId) => {
  const cookie = await cookieAfterChoosingTransporterType(server, sessionId, {
    transporterType: 'COMMERCIAL'
  })
  return getPage(server, commercialTransporterPath(), sessionId, cookie)
}

const postWithCommercialTypeChosen = async (server, sessionId, payload) => {
  const cookie = await cookieAfterChoosingTransporterType(server, sessionId, {
    transporterType: 'COMMERCIAL'
  })
  return postPage(
    server,
    commercialTransporterPath(),
    sessionId,
    payload,
    cookie
  )
}

describe('#commercialTransporterController', { concurrent: false }, () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  test('GET without a transporter type chosen returns to the transporter type question', async () => {
    const response = await getPage(
      getServer(),
      commercialTransporterPath(),
      'commercial-no-type'
    )

    expectRedirectTo(response, transporterTypePath())
  })

  test('GET with the type chosen shows the form fields including the approval number, the fixed country, title and Cancel', async () => {
    const { result, statusCode } = await getWithCommercialTypeChosen(
      getServer(),
      'commercial-get'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect(textsOf($, 'h1')).toEqual(['Add a commercial transporter'])
    expect(textsOf($, CAPTION)).toEqual(['Add a new transporter'])
    expect(textsOf($, FORM_LABEL_SELECTOR)).toContain('Approval number')
    expect($('select[disabled] option[selected]').text().trim()).toBe(
      'Northern Ireland'
    )
    expect($('input[type="hidden"][name="countryCode"]').attr('value')).toBe(
      'GB-NIR'
    )
    expect(textOf($, 'form a.govuk-link')).toBe(
      'Cancel and return to address book'
    )
  })

  test('A valid save sends the fixed country code and type COMMERCIAL, and lands on the address book filtered to transporters with the success banner set', async () => {
    const { scope, captured } = serveTransporterCreationCapturingBody()

    const response = await postWithCommercialTypeChosen(
      getServer(),
      'commercial-save',
      VALID_PAYLOAD
    )

    expectRedirectTo(response, `${addressBookPath()}?addressType=TRANSPORTER`)
    expect(scope.isDone()).toBe(true)
    expect(captured.body).toMatchObject({
      ...VALID_PAYLOAD,
      type: 'COMMERCIAL'
    })

    const listCookie = cookieHeaderOf(response.headers)
    const { result } = await getPage(
      getServer(),
      `${addressBookPath()}?addressType=TRANSPORTER`,
      'commercial-save',
      listCookie
    )
    expect(result).toContain('Success')
  })

  test('A tampered country posted in place of the hidden field is refused rather than corrected, and creates nothing', async () => {
    const { expectNotSent } = interceptAddressBookRequest(
      'POST',
      '/organisation/5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88/transporters'
    )

    const { result, statusCode } = await postWithCommercialTypeChosen(
      getServer(),
      'commercial-tampered-country',
      { ...VALID_PAYLOAD, countryCode: 'GB' }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(textsOf(load(result), ERROR_SUMMARY_LINKS)).toContain(
      'A commercial transporter must be in Northern Ireland'
    )
    expectNotSent()
  })

  test('A missing approval number is refused, naming the approval number', async () => {
    const { result, statusCode } = await postWithCommercialTypeChosen(
      getServer(),
      'commercial-no-approval',
      { ...VALID_PAYLOAD, approvalNumber: '' }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(textsOf(load(result), ERROR_SUMMARY_LINKS)).toContain(
      'Enter the approval number'
    )
  })
})
