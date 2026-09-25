import { createServer } from '../../server.js'

export async function startTestServer() {
  const server = await createServer()
  await server.initialize()
  return server
}

export async function stopTestServer(server) {
  await server.stop({ timeout: 0 })
}
