import { afterAll, beforeAll, beforeEach } from 'vitest'

import { runInRealMode, serveCountries } from './real-mode.js'
import { serveOidcDiscovery } from './serve-oidc-discovery.js'
import { startTestServer, stopTestServer } from './start-test-server.js'

export {
  startServerPastDiscoveryRetries,
  startTestServer,
  stopTestServer
} from './start-test-server.js'

export const startRealModeServer = () => {
  let startedServer

  runInRealMode()

  beforeAll(async () => {
    serveOidcDiscovery()
    startedServer = await startTestServer()
  })

  afterAll(async () => {
    await stopTestServer(startedServer)
  })

  return () => startedServer
}

export const startRealModeServerServingCountries = (countries) => {
  const getServer = startRealModeServer()

  beforeEach(() => {
    serveCountries(countries)
  })

  return getServer
}
