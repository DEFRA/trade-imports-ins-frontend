import { afterAll, beforeAll, beforeEach } from 'vitest'

import { createServer } from '../../server.js'
import { answerOidcDiscovery } from './answer-oidc-discovery.js'
import { runInRealMode, serveCountries } from './real-mode.js'

export async function startTestServer() {
  const server = await createServer()
  await server.initialize()
  return server
}

export async function stopTestServer(server) {
  await server.stop({ timeout: 0 })
}

export const startRealModeServer = () => {
  let startedServer

  runInRealMode()

  beforeAll(async () => {
    answerOidcDiscovery()
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
