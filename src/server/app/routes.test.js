import { describe, expect, it } from 'vitest'

import { allRoutes } from './features/index.js'
import { addressIdParams } from './features/address-book/address-id-params.js'

describe('promoted route authentication', () => {
  it('Should name the session strategy on every promoted route', () => {
    expect(allRoutes).not.toHaveLength(0)

    for (const route of allRoutes) {
      expect(route.options).toMatchObject({ auth: 'session' })
    }
  })

  it('Should promote every public page of the service, and nothing else', () => {
    expect(allRoutes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'GET /',
      'GET /address-book',
      'GET /address-book/add',
      'POST /address-book/add',
      'GET /address-book/{id}',
      'GET /address-book/{id}/edit',
      'POST /address-book/{id}/edit',
      'GET /address-book/{id}/delete',
      'POST /address-book/{id}/delete'
    ])
  })

  it('Should validate the address id on every route that carries one', () => {
    const routesWithId = allRoutes.filter((route) =>
      route.path.includes('{id}')
    )

    expect(routesWithId).toHaveLength(5)
    for (const route of routesWithId) {
      expect(route.options.validate.params).toBe(addressIdParams)
    }
  })
})
