import { createServer as createNetServer } from 'node:net'

import nock from 'nock'
import { beforeAll, afterAll, afterEach, describe, expect, test } from 'vitest'

import { config } from '../../../config/config.js'
import { answerOidcDiscovery } from '../test-helpers/answer-oidc-discovery.js'
import { startServer } from './start-server.js'

const listenOnFreePort = (host) =>
  new Promise((resolve, reject) => {
    const occupier = createNetServer()
    occupier.once('error', reject)
    occupier.listen(0, host, () => resolve(occupier))
  })

describe('#startServer', () => {
  const originalPort = config.get('port')

  beforeAll(() => {
    nock.disableNetConnect()
  })

  afterEach(() => {
    nock.cleanAll()
    config.set('port', originalPort)
  })

  afterAll(() => {
    nock.enableNetConnect()
  })

  describe('When server starts', () => {
    let server

    beforeAll(async () => {
      config.set('port', 0)
      answerOidcDiscovery()
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
      answerOidcDiscovery()

      try {
        await expect(startServer()).rejects.toThrow(/EADDRINUSE/)
      } finally {
        await new Promise((resolve) => occupier.close(resolve))
      }
    })
  })
})
