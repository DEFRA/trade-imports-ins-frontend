import { getDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'
import Wreck from '@hapi/wreck'

import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest'
import { expectHealthy } from '../test-helpers/expect-healthy.js'
import { serveOidcDiscovery } from '../test-helpers/serve-oidc-discovery.js'

vi.mock('../../server.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    createServer: vi.fn(async () => {
      const server = await actual.createServer()
      server.start = () => server.initialize()
      return server
    })
  }
})

import { startServer } from './start-server.js'
import { createServer } from '../../server.js'

describe('#startServer', () => {
  describe('When server starts', () => {
    let server

    beforeAll(async () => {
      serveOidcDiscovery()
      server = await startServer()
    })

    afterAll(async () => {
      await server?.stop({ timeout: 0 })
    })

    test('Should start up server as expected', async () => {
      await expectHealthy(server)
    })

    test('gives each address of a host one second to connect before trying the next', () => {
      expect(getDefaultAutoSelectFamilyAttemptTimeout()).toBe(1000)
    })

    test('keeps the connections of Wreck calls made without an agent open for the next call', () => {
      expect(Wreck.agents.http.keepAlive).toBe(true)
    })
  })

  describe('When server start fails', () => {
    test('Should propagate createServer errors', async () => {
      vi.mocked(createServer).mockRejectedValueOnce(
        new Error('Server failed to start')
      )

      await expect(startServer()).rejects.toThrow('Server failed to start')
    })
  })
})
