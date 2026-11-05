import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest'
import { statusCodes } from '../constants/status-codes.js'
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
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/health'
      })

      expect(result).toEqual({ message: 'success' })
      expect(statusCode).toBe(statusCodes.ok)
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
