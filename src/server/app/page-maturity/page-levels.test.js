import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createServer } from '../../server.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'
import { LEVELS } from './levels.js'
import { PAGE_LEVELS, SECTION_LEVELS } from './page-levels.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#page levels', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const getRoutePaths = () =>
    new Set(
      server
        .table()
        .filter(({ method }) => method === 'get')
        .map(({ path }) => path)
    )

  it('Should list only paths that are registered GET routes', () => {
    const routePaths = getRoutePaths()

    for (const routePath of Object.keys(PAGE_LEVELS)) {
      expect(routePaths, `${routePath} must be a GET route`).toContain(
        routePath
      )
    }
  })

  it('Should list only sections that are registered GET routes', () => {
    const routePaths = getRoutePaths()

    for (const { section } of SECTION_LEVELS) {
      expect(routePaths, `${section} must be a GET route`).toContain(section)
    }
  })

  it('Should give every page and section a known level', () => {
    const levels = new Set(Object.values(LEVELS))

    for (const level of [
      ...Object.values(PAGE_LEVELS),
      ...SECTION_LEVELS.map(({ level: sectionLevel }) => sectionLevel)
    ]) {
      expect(levels).toContain(level)
    }
  })
})
