import { afterEach, describe, expect, it } from 'vitest'

import { config } from '../../../config/config.js'
import { copy } from './copy/copy.en.js'
import { LEVELS, TAG_CLASSES } from './levels.js'
import { pageLevelFor, pageMaturityContext } from './page-maturity.js'

const FLAG = 'pageMaturityBanner.enabled'
const EXPLORING_PAGE = '/notification-type'

describe('#pageLevelFor', () => {
  it.each([
    ['/notification-type', LEVELS.exploring],
    ['/address-book', LEVELS.detailing]
  ])('Should return the level of the listed path %s', (routePath, level) => {
    expect(pageLevelFor(routePath)).toBe(level)
  })

  it('Should return undefined for a path that is not listed', () => {
    expect(pageLevelFor('/auth/sign-out')).toBeUndefined()
  })

  it.each([
    '/address-book/{id}',
    '/notification-type-x',
    '/address-book/add/x'
  ])(
    'Should return undefined for %s, which only shares a prefix with a listed path',
    (routePath) => {
      expect(pageLevelFor(routePath)).toBeUndefined()
    }
  )

  it.each([undefined, ''])(
    'Should return undefined for the path %j',
    (routePath) => {
      expect(pageLevelFor(routePath)).toBeUndefined()
    }
  )

  it('Should not treat an inherited Object property as a listed path', () => {
    expect(pageLevelFor('constructor')).toBeUndefined()
  })
})

describe('#pageMaturityContext', () => {
  const initial = config.get(FLAG)

  afterEach(() => {
    config.set(FLAG, initial)
  })

  it('Should return the tag, class, line and hidden prefix for a listed route when the switch is on', () => {
    config.set(FLAG, true)

    expect(pageMaturityContext({ route: { path: EXPLORING_PAGE } })).toEqual({
      pageMaturity: {
        tag: {
          text: copy.levels.exploring.tag,
          classes: TAG_CLASSES.exploring
        },
        text: copy.levels.exploring.text,
        hiddenPrefix: copy.hiddenPrefix
      }
    })
  })

  it('Should return nothing for an unlisted route', () => {
    config.set(FLAG, true)

    expect(pageMaturityContext({ route: { path: '/auth/sign-out' } })).toEqual(
      {}
    )
  })

  it('Should return nothing for a listed route when the switch is off', () => {
    config.set(FLAG, false)

    expect(pageMaturityContext({ route: { path: EXPLORING_PAGE } })).toEqual({})
  })

  it('Should return nothing for a request with no route', () => {
    config.set(FLAG, true)

    expect(pageMaturityContext({ path: EXPLORING_PAGE })).toEqual({})
  })

  it('Should be on by default', () => {
    expect(initial).toBe(true)
  })
})
