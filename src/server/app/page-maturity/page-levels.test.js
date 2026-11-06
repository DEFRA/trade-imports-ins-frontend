import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { serveOidcDiscovery } from '../../common/test-helpers/serve-oidc-discovery.js'
import {
  startTestServer,
  stopTestServer
} from '../../common/test-helpers/test-server.js'
import { LEVELS } from './levels.js'
import { PAGE_LEVELS, SECTION_LEVELS } from './page-levels.js'
import { isInSection } from './page-maturity.js'

describe('page maturity page levels', () => {
  let server

  beforeAll(async () => {
    serveOidcDiscovery()
    server = await startTestServer()
  })

  afterAll(async () => {
    await stopTestServer(server)
  })

  const registeredGetPaths = () =>
    server
      .table()
      .filter((route) => route.method === 'get')
      .map((route) => route.path)

  it('Should list only GET routes the server really registers', () => {
    const registered = new Set(registeredGetPaths())

    for (const routePath of Object.keys(PAGE_LEVELS)) {
      expect(registered.has(routePath), `${routePath} is not a route`).toBe(
        true
      )
    }
  })

  it('Should list only sections that hold at least one registered GET route', () => {
    const registered = registeredGetPaths()

    for (const { section } of SECTION_LEVELS) {
      expect(
        registered.some((routePath) => isInSection(routePath, section)),
        `${section} holds no route`
      ).toBe(true)
    }
  })

  it('Should give every page and section a known level', () => {
    const levels = [
      ...Object.values(PAGE_LEVELS),
      ...SECTION_LEVELS.map(({ level }) => level)
    ]

    for (const level of levels) {
      expect(Object.values(LEVELS)).toContain(level)
    }
  })
})
