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
import { recordModuleLoggerInfo } from '../../../../common/test-helpers/module-logger-lines.js'
import {
  textOf,
  textsOf
} from '../../../../common/test-helpers/rendered-text.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'

const NO_TYPE_CHOSEN_MESSAGE =
  'No transporter type chosen that this form serves, sending the user to choose one'
const COUNTRY_FIXED_MESSAGE =
  'A commercial transporter must be in Northern Ireland'

const CAPTION = '.govuk-caption-l'
const FORM_LABEL_SELECTOR = 'form label'
const ERROR_SUMMARY_LINKS = '.govuk-error-summary a'
const CANCEL_BUTTON = 'form button[name="cancel"]'

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
  const { entriesWith: infoLogs } = recordModuleLoggerInfo()

  test('GET without a transporter type chosen returns to the transporter type question, logging once', async () => {
    const response = await getPage(
      getServer(),
      commercialTransporterPath(),
      'commercial-no-type'
    )

    expectRedirectTo(response, transporterTypePath())
    expect(infoLogs(NO_TYPE_CHOSEN_MESSAGE)).toEqual([
      {
        fields: {
          organisationId: ORGANISATION_ID,
          path: commercialTransporterPath()
        },
        message: NO_TYPE_CHOSEN_MESSAGE
      }
    ])
  })

  test('POST without a transporter type chosen returns to the transporter type question, logging once', async () => {
    const response = await postPage(
      getServer(),
      commercialTransporterPath(),
      'commercial-no-type-post',
      VALID_PAYLOAD
    )

    expectRedirectTo(response, transporterTypePath())
    expect(infoLogs(NO_TYPE_CHOSEN_MESSAGE)).toEqual([
      {
        fields: {
          organisationId: ORGANISATION_ID,
          path: commercialTransporterPath()
        },
        message: NO_TYPE_CHOSEN_MESSAGE
      }
    ])
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
    expect(textOf($, CANCEL_BUTTON)).toBe('Cancel and return to address book')
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

  test.each([
    ['a wrong country code', 'GB'],
    ['a blank country code', '']
  ])(
    'A tampered country posted in place of the hidden field (%s) is refused rather than corrected, and creates nothing',
    async (_label, tamperedCountryCode) => {
      const { expectNotSent } = interceptAddressBookRequest(
        'POST',
        '/organisation/5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88/transporters'
      )

      const { result, statusCode } = await postWithCommercialTypeChosen(
        getServer(),
        'commercial-tampered-country',
        { ...VALID_PAYLOAD, countryCode: tamperedCountryCode }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      const $ = load(result)
      expect(textsOf($, ERROR_SUMMARY_LINKS)).toContain(COUNTRY_FIXED_MESSAGE)
      const summaryLink = $(ERROR_SUMMARY_LINKS).filter((_, link) =>
        $(link).text().includes(COUNTRY_FIXED_MESSAGE)
      )
      expect(summaryLink.attr('href')).toBe('#countryCode')
      const select = $('#countryCode')
      const describedBy = select.attr('aria-describedby')
      expect(describedBy).toBeTruthy()
      expect($(`#${describedBy}`).text()).toContain(COUNTRY_FIXED_MESSAGE)
      expectNotSent()
    }
  )

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

  test('A refused form reopens with the previously entered values still in the inputs', async () => {
    const posted = await postWithCommercialTypeChosen(
      getServer(),
      'commercial-reopen',
      { ...VALID_PAYLOAD, approvalNumber: '' }
    )
    expect(posted.statusCode).toBe(statusCodes.badRequest)

    const cookie = cookieHeaderOf(posted.headers)
    const { result } = await getPage(
      getServer(),
      commercialTransporterPath(),
      'commercial-reopen',
      cookie
    )

    const $ = load(result)
    expect($('#addressLine1').attr('value')).toBe(VALID_PAYLOAD.addressLine1)
    expect($('#townOrCity').attr('value')).toBe(VALID_PAYLOAD.townOrCity)
  })
})
