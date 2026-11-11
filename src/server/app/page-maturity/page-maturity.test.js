import { afterEach, describe, expect, it } from 'vitest'

import { config } from '../../../config/config.js'
import { startRealModeServer } from '../../common/test-helpers/test-server.js'
import { unauthorisedPage } from '../auth/page.js'
import { addressEditPage } from '../features/address-book/edit/page.js'
import { dashboardPage } from '../features/dashboard/page.js'
import { allRoutes } from '../features/index.js'
import { pageRouteOptions } from '../shared/kit.js'
import { copy } from './copy/copy.en.js'
import { BANNER_CLASSES, LEVELS, TAG_CLASSES } from './levels.js'
import { pageLevelFor, pageMaturityContext } from './page-maturity.js'

const FLAG = 'pageMaturityBanner.enabled'

const requestFor = (page, response) => ({
  route: { settings: pageRouteOptions(page) },
  ...(response && { response })
})

describe('#pageLevelFor', () => {
  it.each(Object.values(LEVELS))(
    'Should give a page the %s level its page.js sets',
    (level) => {
      expect(pageLevelFor({ id: 'example', maturity: level })).toBe(level)
    }
  )

  it('Should make a page that sets no level Exploring', () => {
    expect(pageLevelFor({ id: 'example' })).toBe(LEVELS.exploring)
  })

  it('Should return undefined when there is no page', () => {
    expect(pageLevelFor(undefined)).toBeUndefined()
  })
})

describe('#pageMaturityContext', () => {
  const initial = config.get(FLAG)

  afterEach(() => {
    config.set(FLAG, initial)
  })

  it('Should default the switch to on', () => {
    expect(config.default(FLAG)).toBe(true)
  })

  it('Should return the tag, class, line and hidden prefix for the level the route page sets', () => {
    expect(
      pageMaturityContext(
        requestFor({ id: 'example', maturity: LEVELS.detailing })
      )
    ).toEqual({
      pageMaturity: {
        tag: {
          text: copy.levels.detailing.tag,
          classes: TAG_CLASSES.detailing
        },
        text: copy.levels.detailing.text,
        classes: BANNER_CLASSES.detailing,
        hiddenPrefix: copy.hiddenPrefix
      }
    })
  })

  it('Should return nothing for a route that carries no page', () => {
    expect(
      pageMaturityContext({ route: { settings: { auth: 'session' } } })
    ).toEqual({})
  })

  it('Should return nothing when the switch is off', () => {
    config.set(FLAG, false)

    expect(pageMaturityContext(requestFor(dashboardPage))).toEqual({})
  })

  it('Should return nothing when the error page is rendered on a route with a page', () => {
    expect(
      pageMaturityContext(
        requestFor(dashboardPage, { source: { template: 'shared/error' } })
      )
    ).toEqual({})
  })

  it('Should return nothing for a request with no route', () => {
    expect(pageMaturityContext({ path: '/' })).toEqual({})
  })
})

describe('page maturity of the registered routes', () => {
  const getServer = startRealModeServer()

  const routeAt = (method, path) =>
    getServer()
      .table()
      .find((route) => route.method === method && route.path === path)

  const levelOf = (route) => pageLevelFor(route.settings.app?.page)

  it('Should give every feature route a page', () => {
    for (const route of allRoutes) {
      expect(
        route.options.app?.page,
        `${route.method} ${route.path}`
      ).toBeDefined()
    }
  })

  it('Should make every INS page Exploring', () => {
    const pageRoutes = getServer()
      .table()
      .filter((route) => route.settings.app?.page)

    expect(pageRoutes.length).toBeGreaterThan(0)
    for (const route of pageRoutes) {
      expect(levelOf(route), `${route.method} ${route.path}`).toBe(
        LEVELS.exploring
      )
    }
  })

  it.each([
    ['get', '/', dashboardPage],
    ['post', '/address-book/{id}/edit', addressEditPage],
    ['get', '/auth/sign-in-oidc', unauthorisedPage]
  ])(
    'Should carry the page from its feature on %s %s',
    (method, path, page) => {
      expect(routeAt(method, path).settings.app.page).toEqual(page)
    }
  )

  it.each(['/health', '/auth/sign-out'])('Should give %s no level', (path) => {
    expect(levelOf(routeAt('get', path))).toBeUndefined()
  })
})
