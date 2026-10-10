import { load } from 'cheerio'
import nock from 'nock'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { createServer } from '../../../server.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../../common/test-helpers/session-auth.js'
import { runInRealMode } from '../../../common/test-helpers/real-mode.js'
import { config } from '../../../../config/config.js'
import { activeNavigationItem } from '../../../../config/nunjucks/context/context.js'

vi.mock('../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const NOTIFICATION_TYPE_URL = '/notification-type'
const TITLE = 'What are you importing?'
const TITLE_PATTERN = ' - Import notification service - GOV.UK'
const ERROR_MESSAGE = 'Select what you are importing'
const ANIMALS_BASE_URL = 'http://localhost:3000'
const PLANTS_BASE_URL = 'http://localhost:3003'
const LABELS_IN_ORDER = [
  'Live animals',
  'Germinal products (semen, ova, embryos)',
  'Plants for planting',
  'Potatoes (seed and ware)',
  'Wood products'
]

describe('#notificationTypeController', { concurrent: false }, () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    config.set('csrf.enabled', false)
    config.set('tradeImportsAnimalsFrontend.baseUrl', ANIMALS_BASE_URL)
    config.set('tradeImportsPlantsFrontend.baseUrl', PLANTS_BASE_URL)
  })

  const getPage = (user) =>
    server.inject({
      method: 'GET',
      url: NOTIFICATION_TYPE_URL,
      auth: sessionAuth(user)
    })

  const postType = (user, payload) =>
    server.inject({
      method: 'POST',
      url: NOTIFICATION_TYPE_URL,
      auth: sessionAuth(user),
      payload
    })

  test('GET asks what you are importing under the About the consignment caption, with the GOV.UK title pattern', async () => {
    const { result, statusCode, headers } = await getPage('type-get')

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain(`<title>${TITLE}${TITLE_PATTERN}</title>`)
    expect(result).toContain('govuk-fieldset__legend--l')
    expect(result).toMatch(
      /<h1 class="govuk-fieldset__heading">[\s\S]*govuk-caption-l[\s\S]*About the consignment[\s\S]*What are you importing\?[\s\S]*<\/h1>/
    )
    expect(headers['cache-control']).toBe('no-store')
  })

  test('GET offers the five options in order with none selected and no hint', async () => {
    const { result } = await getPage('type-options')

    const positions = LABELS_IN_ORDER.map((label) => result.indexOf(label))
    expect(positions.every((position) => position > -1)).toBe(true)
    expect(positions).toEqual(positions.toSorted((a, b) => a - b))
    expect(result).not.toContain('checked')
    expect(result).not.toContain('govuk-hint')
  })

  test('GET ends with a single Continue button and no save-and-return or cancel', async () => {
    const { result } = await getPage('type-buttons')

    expect(result.match(/class="govuk-button"/g)).toHaveLength(1)
    expect(result).toContain('Continue')
    expect(result).not.toContain('Save and return to overview')
    expect(result).not.toContain('Cancel')
  })

  test('GET links Back to the INS home and shows no draft strip or reference', async () => {
    const { result } = await getPage('type-back')

    expect(load(result)('.govuk-back-link').attr('href')).toBe('/')
    expect(result).not.toContain('app-journey-strip')
    expect(result).not.toContain('GBN-')
  })

  test('GET puts /notification-type in the dashboard navigation section', async () => {
    // The injected session has no cached sign-in, so the navigation itself is
    // proven in the fit spec; here the page's section is what is pinned.
    const { statusCode } = await getPage('type-nav')

    expect(statusCode).toBe(statusCodes.ok)
    expect(activeNavigationItem(NOTIFICATION_TYPE_URL)).toBe('dashboard')
  })

  test('POST with nothing chosen re-shows the page with the error, linked to the first option', async () => {
    const { result, statusCode } = await postType('type-post-empty', {})

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('There is a problem')
    expect(result).toContain('href="#notificationType"')
    expect(result.match(new RegExp(ERROR_MESSAGE, 'g'))).toHaveLength(2)
    expect(result).toContain('govuk-error-message')
    expect(result).toContain(`<title>Error: ${TITLE}${TITLE_PATTERN}</title>`)
    expect(result).not.toContain('checked')
  })

  test('POST with a value that is not offered is refused the same way', async () => {
    const { result, statusCode } = await postType('type-post-fish', {
      notificationType: 'fish'
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain(ERROR_MESSAGE)
  })

  test.each([
    ['live-animals', `${ANIMALS_BASE_URL}/live-animals/start`],
    ['germinal-products', `${ANIMALS_BASE_URL}/germinal-products/start`],
    ['plants-for-planting', `${PLANTS_BASE_URL}/high-risk-plants/start`],
    ['potatoes', `${PLANTS_BASE_URL}/high-risk-plants/start`],
    ['wood-products', `${PLANTS_BASE_URL}/high-risk-plants/start`]
  ])('POST %s hands over to %s', async (value, location) => {
    const { statusCode, headers } = await postType(`type-post-${value}`, {
      notificationType: value
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(location)
  })

  test('GET and POST call no other service, so no notification exists until a journey frontend creates it', async () => {
    nock.disableNetConnect()
    const attempts = []
    const onNoMatch = (req) => attempts.push(req)
    nock.emitter.on('no match', onNoMatch)

    try {
      const page = await getPage('type-no-upstream-get')
      const chosen = await postType('type-no-upstream-post', {
        notificationType: 'live-animals'
      })

      expect(page.statusCode).toBe(statusCodes.ok)
      expect(chosen.statusCode).toBe(statusCodes.redirectFound)
      expect(attempts).toEqual([])
    } finally {
      nock.emitter.removeListener('no match', onNoMatch)
      nock.enableNetConnect()
      nock.cleanAll()
    }
  })
})
