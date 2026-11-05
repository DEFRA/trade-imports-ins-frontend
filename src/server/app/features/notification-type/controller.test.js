import { load } from 'cheerio'
import nock from 'nock'
import { beforeEach, describe, expect, test } from 'vitest'

import { startRealModeServer } from '../../../common/test-helpers/test-server.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { recordModuleLoggerInfo } from '../../../common/test-helpers/module-logger-lines.js'
import { restoreConfigAfterEach } from '../../../common/test-helpers/restore-config-after-each.js'
import {
  ORGANISATION_ID,
  sessionAuth
} from '../../../common/test-helpers/session-auth.js'
import { config } from '../../../../config/config.js'
import { handOversFor } from './hand-overs.test-support.js'

const NOTIFICATION_TYPE_URL = '/notification-type'
const TITLE = 'What are you importing?'
const TITLE_SUFFIX = ' - Import notification service - GOV.UK'
const ERROR_MESSAGE = 'Select what you are importing'
const ANIMALS_BASE_URL = 'http://localhost:3000'
const PLANTS_BASE_URL = 'http://localhost:3003'
const CRN = '1100598138'
const HAND_OVER_MESSAGE =
  'Notification type chosen, handing over to the journey frontend'
const LABELS_IN_ORDER = [
  'Live animals',
  'Germinal products (semen, ova, embryos)',
  'Plants for planting',
  'Potatoes (seed and ware)',
  'Wood products'
]
const linkTextsInMain = ($) =>
  $('main a')
    .map((_index, link) => $(link).text().trim())
    .get()

const HAND_OVERS = handOversFor({
  animalsBaseUrl: ANIMALS_BASE_URL,
  plantsBaseUrl: PLANTS_BASE_URL
})

describe('#notificationTypeController', { concurrent: false }, () => {
  restoreConfigAfterEach([
    'csrf.enabled',
    'tradeImportsAnimalsFrontend.baseUrl',
    'tradeImportsPlantsFrontend.baseUrl'
  ])
  const server = startRealModeServer()
  const { entries: loggedInfo, entriesWith: loggedWith } =
    recordModuleLoggerInfo()

  beforeEach(() => {
    config.set('csrf.enabled', false)
    config.set('tradeImportsAnimalsFrontend.baseUrl', ANIMALS_BASE_URL)
    config.set('tradeImportsPlantsFrontend.baseUrl', PLANTS_BASE_URL)
  })

  const getPage = (user) =>
    server().inject({
      method: 'GET',
      url: NOTIFICATION_TYPE_URL,
      auth: sessionAuth(user, { crn: CRN })
    })

  const postType = (user, payload) =>
    server().inject({
      method: 'POST',
      url: NOTIFICATION_TYPE_URL,
      auth: sessionAuth(user, { crn: CRN }),
      payload
    })

  test('GET titles the page and puts the caption and question in the heading legend', async () => {
    const { result, statusCode, headers } = await getPage('type-get')

    const $ = load(result)
    expect(statusCode).toBe(statusCodes.ok)
    expect($('head > title').text().trim()).toBe(`${TITLE}${TITLE_SUFFIX}`)
    expect($('legend h1.govuk-fieldset__heading').text()).toMatch(
      /^\s*About the consignment\s+What are you importing\?\s*$/
    )
    expect($('legend h1 .govuk-caption-l').text()).toBe('About the consignment')
    expect(headers['cache-control']).toBe('no-store')
  })

  test('GET offers the five options in order with none selected', async () => {
    const { result } = await getPage('type-options')

    const $ = load(result)
    expect(
      $('.govuk-radios__label')
        .map((_index, label) => $(label).text().trim())
        .get()
    ).toEqual(LABELS_IN_ORDER)
    expect($('.govuk-radios__input:checked')).toHaveLength(0)
    expect($('.govuk-radios__input').attr('name')).toBe('notificationType')
  })

  test('GET ends with one Continue button', async () => {
    const { result } = await getPage('type-buttons')

    const $ = load(result)
    const buttons = $('main button, main a.govuk-button')
    expect(buttons).toHaveLength(1)
    expect(buttons.text().trim()).toBe('Continue')
    expect(linkTextsInMain($)).toEqual([])
  })

  test('GET links Back to the INS home', async () => {
    const { result } = await getPage('type-back')

    expect(load(result)('.govuk-back-link').attr('href')).toBe('/')
  })

  test('POST with nothing chosen re-shows the question with the error summary, linked and inline', async () => {
    const { result, statusCode } = await postType('type-post-empty', {})

    const $ = load(result)
    expect(statusCode).toBe(statusCodes.badRequest)
    expect($('head > title').text().trim()).toBe(
      `Error: ${TITLE}${TITLE_SUFFIX}`
    )
    expect($('.govuk-error-summary__title').text().trim()).toBe(
      'There is a problem'
    )
    const summaryLink = $('.govuk-error-summary__list a')
    expect(summaryLink.text()).toBe(ERROR_MESSAGE)
    expect(summaryLink.attr('href')).toBe('#notificationType')
    expect($('.govuk-error-message').text()).toContain(ERROR_MESSAGE)
    expect(linkTextsInMain($)).toEqual([ERROR_MESSAGE])
    expect(loggedInfo).toEqual([])
  })

  test('POST with a value that is not offered is refused the same way', async () => {
    const { result, statusCode } = await postType('type-post-other', {
      notificationType: 'fish'
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(load(result)('.govuk-error-summary__list a').text()).toBe(
      ERROR_MESSAGE
    )
    expect(loggedInfo).toEqual([])
  })

  test.each(HAND_OVERS)('POST %s hands over to %s', async (value, location) => {
    const { statusCode, headers } = await postType(`type-post-${value}`, {
      notificationType: value
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(location)
  })

  test('POST logs the hand-over once with the organisation, the user, the type and the destination', async () => {
    await postType('type-post-log', { notificationType: 'potatoes' })

    expect(loggedWith(HAND_OVER_MESSAGE)).toEqual([
      {
        fields: {
          organisationId: ORGANISATION_ID,
          crn: CRN,
          notificationType: 'potatoes',
          destination: `${PLANTS_BASE_URL}/high-risk-plants/start`
        },
        message: HAND_OVER_MESSAGE
      }
    ])
    expect(loggedInfo).toHaveLength(1)
  })

  test('GET and POST call no other service', async () => {
    const unmatchedRequests = []
    const recordUnmatched = (request) => unmatchedRequests.push(request)
    nock.emitter.on('no match', recordUnmatched)

    try {
      const page = await getPage('type-no-upstream-get')
      const chosen = await postType('type-no-upstream-post', {
        notificationType: 'live-animals'
      })

      expect(page.statusCode).toBe(statusCodes.ok)
      expect(chosen.statusCode).toBe(statusCodes.redirectFound)
      expect(unmatchedRequests).toEqual([])
    } finally {
      nock.emitter.removeListener('no match', recordUnmatched)
    }
  })
})
