import { createServer as createNetServer } from 'node:net'

import { beforeAll, afterAll, afterEach, describe, expect, test } from 'vitest'

import { config } from '../../../config/config.js'
import { refuseOutboundHttp } from '../test-helpers/real-mode.js'
import { startServer } from './start-server.js'

const listenOnFreePort = (host) =>
  new Promise((resolve, reject) => {
    const occupier = createNetServer()
    occupier.once('error', reject)
    occupier.listen(0, host, () => resolve(occupier))
  })

describe('#startServer', () => {
  const originalPort = config.get('port')

  refuseOutboundHttp()

  afterEach(() => {
    config.set('port', originalPort)
  })

  describe('When server starts', () => {
    let server

    beforeAll(async () => {
      config.set('port', 0)
      server = await startServer()
    })

    afterAll(async () => {
      await server?.stop({ timeout: 0 })
    })

    test('listens on a port once started', () => {
      expect(server.info.started).toBeGreaterThan(0)
      expect(server.info.port).toBeGreaterThan(0)
    })
  })

  describe('When server start fails', () => {
    test('rejects when the port is already in use', async () => {
      const occupier = await listenOnFreePort(config.get('host'))
      config.set('port', occupier.address().port)

      try {
        await expect(startServer()).rejects.toThrow(/EADDRINUSE/)
      } finally {
        await new Promise((resolve) => occupier.close(resolve))
      }
    })
  })
})
