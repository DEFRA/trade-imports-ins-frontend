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

    it('Should leave one phase banner with the Alpha tag and the feedback sentence only', () => {
      expect(banner).toHaveLength(1)
      expect(banner.find('.govuk-tag')).toHaveLength(1)
      expect(normalised(banner.text())).toBe(`Alpha ${SERVICE_SENTENCE}`)
    })

    it('Should add nothing to the layout from the banner snippet', () => {
      expect(environment.render('page-maturity/banner.njk', {})).toBe('')
    })
  })

  describe('when the page has a level', () => {
    const $ = load(renderLayout({ pageMaturity }))
    const banners = $(PHASE_BANNER)
    const alpha = banners.eq(0)
    const level = banners.eq(1)
    const levelTag = level.find('.govuk-tag')

    it('Should add a second phase banner for the level, after the Alpha one', () => {
      expect(banners).toHaveLength(2)
      expect(normalised(alpha.text())).toBe(`Alpha ${SERVICE_SENTENCE}`)
      expect(levelTag).toHaveLength(1)
      expect(levelTag.text().trim()).toBe(copy.levels.detailing.tag)
      expect(levelTag.hasClass(TAG_CLASSES.detailing)).toBe(true)
      expect(levelTag.hasClass('govuk-phase-banner__content__tag')).toBe(true)
      expect(normalised(level.text())).toBe(
        `${copy.levels.detailing.tag} ${copy.hiddenPrefix} ${copy.levels.detailing.text}`
      )
    })

    it('Should leave no line break or spacing utilities in the level row', () => {
      expect(level.find('br')).toHaveLength(0)
      expect(level.html()).not.toContain('govuk-!-margin')
    })

    it('Should keep exactly one link, the feedback email', () => {
      const links = banners.find('a')

      expect(links).toHaveLength(1)
      expect(links.attr('href')).toMatch(/^mailto:/)
    })

    it('Should put the hidden prefix in visually hidden text in the level row', () => {
      expect(level.find('.govuk-visually-hidden').text()).toBe(
        copy.hiddenPrefix
      )
    })

    it('Should keep the service sentence in the Alpha row', () => {
      expect(normalised(alpha.text())).toContain(SERVICE_SENTENCE)
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
