import { afterAll, beforeAll, beforeEach, vi } from 'vitest'

import { createServer } from '../../server.js'
import { runInRealMode, serveCountries } from './real-mode.js'
import { serveOidcDiscovery } from './serve-oidc-discovery.js'

export async function startTestServer() {
  const server = await createServer()
  await server.initialize()
  return server
}

export async function stopTestServer(server) {
  await server.stop({ timeout: 0 })
}

export const startServerPastDiscoveryRetries = async () => {
  const fakeStepMs = 10
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  try {
    const start = { settled: false }
    const starting = startTestServer()
    starting.then(
      () => (start.settled = true),
      () => (start.settled = true)
    )
    while (!start.settled) {
      await new Promise((resolve) => setImmediate(resolve))
      await vi.advanceTimersByTimeAsync(fakeStepMs)
    }
    return await starting
  } finally {
    vi.useRealTimers()
  }
}

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
