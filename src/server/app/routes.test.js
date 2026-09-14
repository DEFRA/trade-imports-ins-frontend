import { describe, expect, it } from 'vitest'

import { allRoutes } from './features/index.js'

describe('promoted route authentication', () => {
  it('Should name the session strategy on every promoted route', () => {
    expect(allRoutes).not.toHaveLength(0)

    for (const route of allRoutes) {
      expect(route.options).toMatchObject({ auth: 'session' })
    }
  })

  it('Should promote exactly the dashboard', () => {
    expect(allRoutes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'GET /'
    ])
  })
})
