import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { createServer } from './server.js'
import { config } from '../config/config.js'
import { statusCodes } from './common/constants/status-codes.js'

describe('#router auth gating', () => {
  let server

  beforeAll(async () => {
    config.set('auth.enabled', false)
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    config.set('auth.enabled', true)
    await server.stop({ timeout: 0 })
  })

  test('address-book routes are not registered when auth is disabled', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book'
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('the dashboard is not registered when auth is disabled', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('health remains available when auth is disabled', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(statusCode).toBe(statusCodes.ok)
  })
})

describe('#router EUDPA-390 address lookup spike gating', () => {
  afterAll(() => {
    config.set('cdpEnvironment', 'local')
  })

  test.each(['dev', 'local'])(
    'the spike page is registered when cdpEnvironment is %s',
    async (cdpEnvironment) => {
      config.set('cdpEnvironment', cdpEnvironment)
      const server = await createServer()
      try {
        await server.initialize()
        const { statusCode } = await server.inject({
          method: 'GET',
          url: '/address-lookup-spike'
        })

        expect(statusCode).not.toBe(statusCodes.notFound)
      } finally {
        await server.stop({ timeout: 0 })
      }
    }
  )

  test.each([
    'test',
    'perf-test',
    'ext-test',
    'prod',
    'infra-dev',
    'management'
  ])(
    'the spike page is not registered when cdpEnvironment is %s',
    async (cdpEnvironment) => {
      config.set('cdpEnvironment', cdpEnvironment)
      const server = await createServer()
      try {
        await server.initialize()
        const { statusCode } = await server.inject({
          method: 'GET',
          url: '/address-lookup-spike'
        })

        expect(statusCode).toBe(statusCodes.notFound)
      } finally {
        await server.stop({ timeout: 0 })
      }
    }
  )
})
