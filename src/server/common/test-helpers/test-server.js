import { createServer } from '../../server.js'

/**
 * @returns {Promise<import('@hapi/hapi').Server>}
 */
export async function startTestServer() {
  const server = await createServer()
  await server.initialize()
  return server
}

/**
 * @param {import('@hapi/hapi').Server} server
 */
export async function stopTestServer(server) {
  await server.stop({ timeout: 0 })
}
