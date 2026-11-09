import { describe, expect, it } from 'vitest'

import { allRoutes } from './features/index.js'
import { recordIdParams } from './features/address-book/record-id-params.js'

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
      'GET /notification-type',
      'POST /notification-type',
      'GET /address-book',
      'GET /address-book/add',
      'POST /address-book/add',
      'GET /address-book/add/address-type',
      'POST /address-book/add/address-type',
      'GET /address-book/{id}',
      'GET /address-book/{id}/edit',
      'POST /address-book/{id}/edit',
      'GET /address-book/{id}/delete',
      'POST /address-book/{id}/delete',
      'GET /address-book/add/transporter',
      'POST /address-book/add/transporter',
      'GET /address-book/add/transporter/private',
      'POST /address-book/add/transporter/private',
      'GET /address-book/add/transporter/commercial',
      'POST /address-book/add/transporter/commercial',
      'GET /address-book/transporter/{id}',
      'GET /address-book/transporter/{id}/edit',
      'POST /address-book/transporter/{id}/edit',
      'GET /address-book/transporter/{id}/delete',
      'POST /address-book/transporter/{id}/delete'
    ])
  })

  it('Should validate the record id on every route that carries one', () => {
    const routesWithId = allRoutes.filter((route) =>
      route.path.includes('{id}')
    )

    expect(routesWithId).toHaveLength(10)
    for (const route of routesWithId) {
      expect(route.options.validate.params).toBe(recordIdParams)
    }
  })
})
