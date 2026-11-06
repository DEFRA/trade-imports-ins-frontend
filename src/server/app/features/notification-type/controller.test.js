import { load } from 'cheerio'
import nock from 'nock'
import { beforeEach, describe, expect, test } from 'vitest'

import { startRealModeServer } from '../../../common/test-helpers/test-server.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import {
  recordModuleLoggerInfo,
  recordModuleLoggerWarn
} from '../../../common/test-helpers/module-logger-lines.js'
import { restoreConfigAfterEach } from '../../../common/test-helpers/restore-config-after-each.js'
import { ORGANISATION_ID } from '../../../common/test-helpers/session-auth.js'
import { config } from '../../../../config/config.js'
import {
  LABELS_IN_ORDER,
  SAMPLE_REFERENCE,
  expectedReturnUrl,
  handOversFor
} from './hand-overs.test-support.js'
import { CRN, requestsTo } from './requests.test-support.js'

const TITLE = 'What are you importing?'
const TITLE_SUFFIX = ' - Import notification service - GOV.UK'
const ERROR_MESSAGE = 'Select what you are importing'
const ANIMALS_BASE_URL = 'http://localhost:3000'
const PLANTS_BASE_URL = 'http://localhost:3003'
const HAND_OVER_MESSAGE =
  'Notification type chosen, handing over to the journey frontend'
const RETURN_MESSAGE = 'Notification type kept, returning to the notification'
const GET_NOT_RECOGNISED_MESSAGE =
  'Returning notification not recognised, type question opened with nothing chosen'
const POST_NOT_RECOGNISED_MESSAGE =
  'Returning notification not recognised, handled as a new notification'
const CHECKED_OPTION = '.govuk-radios__input:checked'
const ID_FIELD = 'input[name="notification-id"]'
const TYPE_FIELD = 'input[name="current-notification-type"]'
const LIVE_ANIMALS = 'live-animals'
const RETURNING_QUERY = `notification-id=${SAMPLE_REFERENCE}&current-notification-type=${LIVE_ANIMALS}`
const RETURNING_PAYLOAD = {
  'notification-id': SAMPLE_REFERENCE,
  'current-notification-type': LIVE_ANIMALS
}
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
  const getServer = startRealModeServer()
  const { entries: loggedInfo, entriesWith: loggedWith } =
    recordModuleLoggerInfo()

  beforeEach(() => {
    config.set('csrf.enabled', false)
    config.set('tradeImportsAnimalsFrontend.baseUrl', ANIMALS_BASE_URL)
    config.set('tradeImportsPlantsFrontend.baseUrl', PLANTS_BASE_URL)
  })

  const { getPage, postType } = requestsTo(getServer)

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
    expect($(CHECKED_OPTION)).toHaveLength(0)
    expect($('.govuk-radios__input').attr('name')).toBe('notificationType')
  })

  test('POST with the notification type kept returns to that notification and logs it once', async () => {
    const { statusCode, headers } = await postType('type-post-return', {
      notificationType: LIVE_ANIMALS,
      ...RETURNING_PAYLOAD
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(
      expectedReturnUrl({
        animalsBaseUrl: ANIMALS_BASE_URL,
        reference: SAMPLE_REFERENCE
      })
    )
    expect(loggedWith(RETURN_MESSAGE)).toEqual([
      {
        fields: {
          organisationId: ORGANISATION_ID,
          crn: CRN,
          notificationReference: SAMPLE_REFERENCE,
          notificationType: LIVE_ANIMALS,
          destination: expectedReturnUrl({
            animalsBaseUrl: ANIMALS_BASE_URL,
            reference: SAMPLE_REFERENCE
          })
        },
        message: RETURN_MESSAGE
      }
    ])
    expect(loggedInfo).toHaveLength(1)
  })

  test.each(HAND_OVERS.filter(([value]) => value !== LIVE_ANIMALS))(
    'POST %s chosen for a live animals notification hands over to %s',
    async (value, location) => {
      const { statusCode, headers } = await postType(`type-other-${value}`, {
        notificationType: value,
        ...RETURNING_PAYLOAD
      })

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe(location)
      expect(loggedWith(RETURN_MESSAGE)).toEqual([])
      expect(loggedWith(HAND_OVER_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
            crn: CRN,
            notificationType: value,
            destination: location,
            leftNotificationReference: SAMPLE_REFERENCE,
            leftNotificationType: LIVE_ANIMALS
          },
          message: HAND_OVER_MESSAGE
        }
      ])
    }
  )

  test('POST with nothing chosen keeps the notification in hidden fields and checks no option', async () => {
    const { result, statusCode } = await postType(
      'type-refused-returning',
      RETURNING_PAYLOAD
    )

    const $ = load(result)
    expect(statusCode).toBe(statusCodes.badRequest)
    expect($(ID_FIELD).attr('value')).toBe(SAMPLE_REFERENCE)
    expect($(TYPE_FIELD).attr('value')).toBe(LIVE_ANIMALS)
    expect($(CHECKED_OPTION)).toHaveLength(0)
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
      const page = await getPage('type-no-upstream-get', RETURNING_QUERY)
      const chosen = await postType('type-no-upstream-post', {
        notificationType: LIVE_ANIMALS
      })
      const returned = await postType('type-no-upstream-return', {
        notificationType: LIVE_ANIMALS,
        ...RETURNING_PAYLOAD
      })

      expect(page.statusCode).toBe(statusCodes.ok)
      expect(chosen.statusCode).toBe(statusCodes.redirectFound)
      expect(returned.statusCode).toBe(statusCodes.redirectFound)
      expect(unmatchedRequests).toEqual([])
    } finally {
      nock.emitter.removeListener('no match', recordUnmatched)
    }
  })
})

describe(
  '#notificationTypeController returning notification',
  { concurrent: false },
  () => {
    const getServer = startRealModeServer()
    const { entriesWith: warnedWith } = recordModuleLoggerWarn()
    const { getPage, postType } = requestsTo(getServer)

    test('GET with a live animals notification checks Live animals alone and carries the reference and type in hidden fields', async () => {
      const { result } = await getPage('type-returning', RETURNING_QUERY)

      const $ = load(result)
      expect($(CHECKED_OPTION)).toHaveLength(1)
      expect($(CHECKED_OPTION).attr('value')).toBe(LIVE_ANIMALS)
      expect($(ID_FIELD).attr('value')).toBe(SAMPLE_REFERENCE)
      expect($(TYPE_FIELD).attr('value')).toBe(LIVE_ANIMALS)
    })

    test.each([
      [
        'a type INS does not offer',
        `notification-id=${SAMPLE_REFERENCE}&current-notification-type=cattle`
      ],
      [
        'a type that takes no notification back',
        `notification-id=${SAMPLE_REFERENCE}&current-notification-type=potatoes`
      ],
      ['no reference', 'current-notification-type=live-animals']
    ])(
      'GET with %s shows nothing selected and no hidden fields',
      async (_name, query) => {
        const { result } = await getPage('type-ignored', query)

        const $ = load(result)
        expect($(CHECKED_OPTION)).toHaveLength(0)
        expect($(ID_FIELD)).toHaveLength(0)
        expect($(TYPE_FIELD)).toHaveLength(0)
      }
    )

    test('GET with a reference and a type that takes nothing back logs once that the returning notification is not recognised', async () => {
      await getPage(
        'type-unrecognised',
        `notification-id=${SAMPLE_REFERENCE}&current-notification-type=unknown`
      )

      expect(warnedWith(GET_NOT_RECOGNISED_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
            notificationReference: SAMPLE_REFERENCE,
            currentNotificationType: 'unknown'
          },
          message: GET_NOT_RECOGNISED_MESSAGE
        }
      ])
    })

    test('POST with a reference and a type that takes nothing back logs once that the returning notification is handled as new', async () => {
      await postType('type-post-unrecognised', {
        notificationType: LIVE_ANIMALS,
        'notification-id': SAMPLE_REFERENCE,
        'current-notification-type': 'unknown'
      })

      expect(warnedWith(POST_NOT_RECOGNISED_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
            notificationReference: SAMPLE_REFERENCE,
            currentNotificationType: 'unknown'
          },
          message: POST_NOT_RECOGNISED_MESSAGE
        }
      ])
    })

    test('GET with a recognised returning notification or no reference logs no warning', async () => {
      await getPage('type-recognised-quiet', RETURNING_QUERY)
      await getPage(
        'type-no-reference-quiet',
        'current-notification-type=unknown'
      )

      expect(warnedWith(GET_NOT_RECOGNISED_MESSAGE)).toEqual([])
    })
  }
)
