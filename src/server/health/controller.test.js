import { statusCodes } from '../common/constants/status-codes.js'
import { serveOidcDiscovery } from '../common/test-helpers/serve-oidc-discovery.js'
import {
  startTestServer,
  stopTestServer
} from '../common/test-helpers/test-server.js'

describe('#healthController', () => {
  let server

  beforeAll(async () => {
    serveOidcDiscovery()
    server = await startTestServer()
  })

  afterAll(async () => {
    await stopTestServer(server)
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(result).toEqual({ message: 'success' })
    expect(statusCode).toBe(statusCodes.ok)
  })
})
