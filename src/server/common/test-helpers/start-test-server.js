import { vi } from 'vitest'

import { createServer } from '../../server.js'

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
