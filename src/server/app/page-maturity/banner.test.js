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
import {
  normalisedText,
  textsOf
} from '../../common/test-helpers/rendered-text.js'
import { sessionAuth } from '../../common/test-helpers/session-auth.js'
import {
  insBackendApi,
  runInRealMode,
  serveCountries
} from '../../common/test-helpers/real-mode.js'
import { sharedCopy } from '../shared/kit.js'
import { copy } from './copy/copy.en.js'
import { BANNER_CLASSES, LEVELS, TAG_CLASSES } from './levels.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const environment = nunjucksConfig.options.compileOptions.environment

const PHASE_BANNER = '.govuk-phase-banner'
const TAG = '.govuk-tag'
const SERVICE_SENTENCE =
  'This is a new service. Help us improve it and give your feedback by email.'

const pageMaturityFor = (level) => ({
  tag: { text: copy.levels[level].tag, classes: TAG_CLASSES[level] },
  text: copy.levels[level].text,
  classes: BANNER_CLASSES[level],
  hiddenPrefix: copy.hiddenPrefix
})

const pageMaturity = pageMaturityFor(LEVELS.detailing)

const renderLayout = (context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Dashboard',
    sharedCopy,
    userSession: { isAuthenticated: false },
    dashboardUrl: '/',
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

describe('page maturity banner', () => {
  describe('when the page has no level', () => {
    const $ = load(renderLayout())
    const banner = $(PHASE_BANNER)

    it('Should leave one phase banner with the Alpha tag and the feedback sentence only', () => {
      expect(banner).toHaveLength(1)
      expect(banner.find(TAG)).toHaveLength(1)
      expect(normalisedText(banner.text())).toBe(`Alpha ${SERVICE_SENTENCE}`)
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
    const levelTag = level.find(TAG)

    it('Should add a second phase banner for the level, after the Alpha one', () => {
      expect(banners).toHaveLength(2)
      expect(normalisedText(alpha.text())).toBe(`Alpha ${SERVICE_SENTENCE}`)
      expect(levelTag).toHaveLength(1)
      expect(levelTag.hasClass(TAG_CLASSES.detailing)).toBe(true)
      expect(levelTag.hasClass('govuk-phase-banner__content__tag')).toBe(true)
      expect(normalisedText(level.text())).toBe(
        `${copy.hiddenPrefix} ${copy.levels.detailing.tag}. ${copy.levels.detailing.text}`
      )
    })

    it.each(Object.values(LEVELS))(
      'Should give the %s row its own modifier class and tag colour',
      (levelId) => {
        const levelBanners = load(
          renderLayout({ pageMaturity: pageMaturityFor(levelId) })
        )(PHASE_BANNER)

        expect(levelBanners.eq(1).hasClass(BANNER_CLASSES[levelId])).toBe(true)
        expect(
          levelBanners.eq(1).find(TAG).hasClass(TAG_CLASSES[levelId])
        ).toBe(true)
        expect(levelBanners.eq(0).attr('class')).not.toContain(
          'app-page-maturity'
        )
      }
    )

    it('Should leave no line break or spacing utilities in the level row', () => {
      expect(level.find('br')).toHaveLength(0)
      expect(level.html()).not.toContain('govuk-!-margin')
    })

    it('Should keep exactly one link, the feedback email', () => {
      const links = banners.find('a')

      expect(links).toHaveLength(1)
      expect(links.attr('href')).toMatch(/^mailto:/)
    })

    it('Should read the hidden status prefix inside the tag, before the level', () => {
      expect(
        normalisedText(levelTag.find('.govuk-visually-hidden').first().text())
      ).toBe(copy.hiddenPrefix)
      expect(normalisedText(levelTag.text())).toBe(
        `${copy.hiddenPrefix} ${copy.levels.detailing.tag}.`
      )
      expect(level.find('.govuk-phase-banner__text').text()).not.toContain(
        copy.hiddenPrefix
      )
    })

    it('Should keep the service sentence in the Alpha row', () => {
      expect(normalisedText(alpha.text())).toContain(SERVICE_SENTENCE)
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
      serveCountries([{ code: 'GB', name: 'United Kingdom' }])
      insBackendApi()
        .get('/notifications')
        .query({ page: '1', sort: 'arrivalDate,desc' })
        .reply(statusCodes.ok, {
          content: [],
          page: 1,
          size: 25,
          numberOfElements: 0,
          totalElements: 0,
          totalPages: 0
        })
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth(user)
      })

      expect(statusCode).toBe(statusCodes.ok)
      return textsOf(load(result), `${PHASE_BANNER} ${TAG}`)
    }

    it('Should show the level tag after Alpha when the switch is on', async () => {
      config.set('csrf.enabled', false)
      config.set(FLAG, true)

      expect(await getBannerTags('maturity-on')).toEqual([
        'Alpha',
        `${copy.hiddenPrefix} ${copy.levels.exploring.tag}.`
      ])
    })

    it('Should show only the Alpha tag when the switch is off', async () => {
      config.set('csrf.enabled', false)
      config.set(FLAG, false)

      expect(await getBannerTags('maturity-off')).toEqual(['Alpha'])
    })

    it('Should show only the Alpha tag on the not found page, though every route has a level', async () => {
      config.set(FLAG, true)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/no-such-page',
        auth: sessionAuth('maturity-not-found')
      })
      const tags = textsOf(load(result), `${PHASE_BANNER} ${TAG}`)

      expect(statusCode).toBe(statusCodes.notFound)
      expect(tags).toEqual(['Alpha'])
    })
  })
})
