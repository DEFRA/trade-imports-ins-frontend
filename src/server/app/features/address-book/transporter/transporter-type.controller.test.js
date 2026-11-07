import { load } from 'cheerio'
import { describe, expect, test } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressTypePath,
  BACK_LINK,
  commercialTransporterPath,
  expectRedirectTo,
  getPage,
  postPage,
  privateTransporterPath,
  transporterTypePath
} from '../../../../common/test-helpers/address-book-requests.js'
import {
  textOf,
  textsOf
} from '../../../../common/test-helpers/rendered-text.js'
import { startRealModeServer } from '../../../../common/test-helpers/test-server.js'

const CAPTION = '.govuk-caption-l'
const WARNING = '.govuk-warning-text__text'
const RADIO_LABELS = '.govuk-radios__label'
const RADIO_HINTS = '.govuk-radios__hint'
const CHECKED_RADIOS = '.govuk-radios__input[checked]'
const ERROR_LINKS = '.govuk-error-summary__list a'
const MISSING_TYPE_MESSAGE = 'Select what kind of transporter it is'

const checkedValuesOf = ($) =>
  $(CHECKED_RADIOS)
    .map((_, radio) => $(radio).attr('value'))
    .get()

describe('#transporterTypeController', { concurrent: false }, () => {
  const getServer = startRealModeServer()

  test('GET shows the caption, the heading, the warning, two options with the commercial hint, Continue and Back to the address type question, none chosen', async () => {
    const { result, statusCode } = await getPage(
      getServer(),
      transporterTypePath(),
      'transporter-type-get'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect(textsOf($, CAPTION)).toEqual(['Add a new transporter'])
    expect(textsOf($, 'h1')).toEqual(['Choose a transporter type'])
    expect(textOf($, WARNING)).toContain(
      'Check the transporter list before adding new transporters to avoid duplicates.'
    )
    expect(textsOf($, RADIO_LABELS)).toEqual([
      'Private transporter',
      'Commercial'
    ])
    expect(textsOf($, RADIO_HINTS)).toEqual([
      'This can only be a commercial transporter from Northern Ireland.'
    ])
    expect(checkedValuesOf($)).toEqual([])
    expect(textsOf($, 'form button')).toEqual(['Continue'])
    expect($(BACK_LINK).attr('href')).toBe(addressTypePath())
  })

  test('POST with nothing chosen keeps the trader on the page with the refusal inline and as the summary link to the first option, and stores no type', async () => {
    const { result, statusCode } = await postPage(
      getServer(),
      transporterTypePath(),
      'transporter-type-post-none',
      {}
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    const $ = load(result)
    expect(textsOf($, ERROR_LINKS)).toEqual([MISSING_TYPE_MESSAGE])
    expect($(ERROR_LINKS).attr('href')).toBe('#transporterType')
  })

  test('POST of PRIVATE opens the private transporter form', async () => {
    const response = await postPage(
      getServer(),
      transporterTypePath(),
      'transporter-type-post-private',
      { transporterType: 'PRIVATE' }
    )

    expectRedirectTo(response, privateTransporterPath())
  })

  test('POST of COMMERCIAL opens the commercial transporter form', async () => {
    const response = await postPage(
      getServer(),
      transporterTypePath(),
      'transporter-type-post-commercial',
      { transporterType: 'COMMERCIAL' }
    )

    expectRedirectTo(response, commercialTransporterPath())
  })
})
