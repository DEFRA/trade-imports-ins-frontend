import {
  createServer as createNetServer,
  getDefaultAutoSelectFamilyAttemptTimeout
} from 'node:net'
import Wreck from '@hapi/wreck'

import { beforeAll, afterAll, afterEach, describe, expect, test } from 'vitest'

import { config } from '../../../config/config.js'
import { expectHealthy } from '../test-helpers/expect-healthy.js'
import { recordModuleLoggerInfo } from '../test-helpers/module-logger-lines.js'
import { refuseOutboundHttp } from '../test-helpers/real-mode.js'
import { restoreConfigAfterEach } from '../test-helpers/restore-config-after-each.js'
import { serveOidcDiscovery } from '../test-helpers/serve-oidc-discovery.js'
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
      serveOidcDiscovery()
      server = await startServer()
    })

    afterAll(async () => {
      await server?.stop({ timeout: 0 })
    })

    test('listens on a port once started', () => {
      expect(server.info.started).toBeGreaterThan(0)
      expect(server.info.port).toBeGreaterThan(0)
    })

    test('answers GET /health with 200 and a success message', async () => {
      await expectHealthy(server)
    })

    test('gives each address of a host one second to connect before trying the next', () => {
      expect(getDefaultAutoSelectFamilyAttemptTimeout()).toBe(1000)
    })

    test('installs a keep-alive agent for Wreck calls made without an agent', () => {
      expect(Wreck.agents.http.keepAlive).toBe(true)
    })
  })

  describe('When no HTTP proxy is configured', () => {
    const infoLines = recordModuleLoggerInfo()
    restoreConfigAfterEach(['httpProxy', 'port'])

    test('logs once that the retrying keep-alive agent is installed', async () => {
      config.set('httpProxy', null)
      config.set('port', 0)
      serveOidcDiscovery()

      const server = await startServer()
      await server.stop({ timeout: 0 })

      expect(
        infoLines.entriesWith(
          'Wreck plain-HTTP calls use the retrying keep-alive agent'
        )
      ).toEqual([
        {
          fields: { keepAliveAgent: true },
          message: 'Wreck plain-HTTP calls use the retrying keep-alive agent'
        }
      ])
    })
  })

  describe('When an HTTP proxy is configured', () => {
    const infoLines = recordModuleLoggerInfo()
    restoreConfigAfterEach(['httpProxy', 'port'])

    test('logs once that Wreck keeps its own agent, without the proxy URL', async () => {
      config.set('httpProxy', 'http://proxy.test:3128')
      config.set('port', 0)
      serveOidcDiscovery()

      const server = await startServer()
      await server.stop({ timeout: 0 })

      expect(
        infoLines.entriesWith(
          'HTTP proxy configured; Wreck keeps its own agent'
        )
      ).toEqual([
        {
          fields: { keepAliveAgent: false, reason: 'httpProxy' },
          message: 'HTTP proxy configured; Wreck keeps its own agent'
        }
      ])
    })
  })

  describe('When server start fails', () => {
    test('rejects when the port is already in use', async () => {
      const occupier = await listenOnFreePort(config.get('host'))
      config.set('port', occupier.address().port)
      serveOidcDiscovery()

      try {
        await expect(startServer()).rejects.toThrow(/EADDRINUSE/)
      } finally {
        await new Promise((resolve) => occupier.close(resolve))
      }
    })
  })
})
