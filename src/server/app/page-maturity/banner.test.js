import { load } from 'cheerio'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { config } from '../../../config/config.js'
import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../common/test-helpers/session-auth.js'
import { runInRealMode } from '../../common/test-helpers/real-mode.js'
import { sharedCopy } from '../shared/kit.js'
import { copy } from './copy/copy.en.js'
import { TAG_CLASSES } from './levels.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const environment = nunjucksConfig.options.compileOptions.environment

const PHASE_BANNER = '.govuk-phase-banner'
const SERVICE_SENTENCE =
  'This is a new service. Help us improve it and give your feedback by email.'

const pageMaturity = {
  tag: {
    text: copy.levels.detailing.tag,
    classes: TAG_CLASSES.detailing
  },
  text: copy.levels.detailing.text,
  hiddenPrefix: copy.hiddenPrefix
}

const renderLayout = (context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Dashboard',
    sharedCopy,
    userSession: { isAuthenticated: false },
    dashboardUrl: '/',
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

const normalised = (text) => text.replaceAll(/\s+/g, ' ').trim()

describe('page maturity banner', () => {
  describe('when the page has no level', () => {
    const $ = load(renderLayout())
    const banner = $(PHASE_BANNER)

    it('Should leave the phase banner with the Alpha tag and the feedback sentence only', () => {
      expect(banner.find('.govuk-tag')).toHaveLength(1)
      expect(normalised(banner.text())).toBe(`Alpha ${SERVICE_SENTENCE}`)
    })

    it('Should render the same banner as when the value is explicitly undefined', () => {
      const explicit = load(renderLayout({ pageMaturity: null }))

      expect(explicit(PHASE_BANNER).html()).toBe(banner.html())
    })
  })

  describe('when the page has a level', () => {
    const $ = load(renderLayout({ pageMaturity }))
    const banner = $(PHASE_BANNER)
    const tags = banner.find('.govuk-tag')

    it('Should show the Alpha tag, then the level tag with its class, then the line', () => {
      expect(tags).toHaveLength(2)
      expect($(tags[0]).text().trim()).toBe('Alpha')
      expect($(tags[1]).text().trim()).toBe(copy.levels.detailing.tag)
      expect($(tags[1]).hasClass(TAG_CLASSES.detailing)).toBe(true)
      expect(normalised(banner.text())).toContain(
        `${copy.levels.detailing.tag} ${copy.levels.detailing.text}`
      )
    })

    it('Should keep exactly one link, the feedback email', () => {
      const links = banner.find('a')

      expect(links).toHaveLength(1)
      expect(links.attr('href')).toMatch(/^mailto:/)
    })

    it('Should put the hidden prefix in visually hidden text before the level tag', () => {
      const hidden = banner.find('.govuk-visually-hidden')

      expect(hidden.text()).toBe(copy.hiddenPrefix)
      expect(banner.html().indexOf(copy.hiddenPrefix)).toBeLessThan(
        banner.html().indexOf(TAG_CLASSES.detailing)
      )
    })

    it('Should keep the service sentence', () => {
      expect(normalised(banner.text())).toContain(SERVICE_SENTENCE)
    })
  })

  describe('on a rendered page', () => {
    const FLAG = 'pageMaturityBanner.enabled'
    let server

    runInRealMode()

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    afterEach(() => {
      config.set(FLAG, true)
    })

    const getBannerTags = async (user) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/notification-type',
        auth: sessionAuth(user)
      })

      expect(statusCode).toBe(statusCodes.ok)
      return load(result)(`${PHASE_BANNER} .govuk-tag`)
        .map((_, tag) => load(tag).text().trim())
        .get()
    }

    it('Should show the level tag after Alpha when the switch is on', async () => {
      config.set('csrf.enabled', false)
      config.set(FLAG, true)

      expect(await getBannerTags('maturity-on')).toEqual([
        'Alpha',
        copy.levels.exploring.tag
      ])
    })

    it('Should show only the Alpha tag when the switch is off', async () => {
      config.set('csrf.enabled', false)
      config.set(FLAG, false)

      expect(await getBannerTags('maturity-off')).toEqual(['Alpha'])
    })
  })
})
