import { statusCodes } from '../constants/status-codes.js'
import { serveOidcDiscovery } from '../test-helpers/serve-oidc-discovery.js'
import { startTestServer, stopTestServer } from '../test-helpers/test-server.js'

describe('#serveStaticFiles', () => {
  let server

  beforeEach(async () => {
    serveOidcDiscovery()
    server = await startTestServer()
  })

  afterEach(async () => {
    await stopTestServer(server)
  })

  test('Should answer /favicon.ico with 204 No Content', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/favicon.ico'
    })

    expect(statusCode).toBe(statusCodes.noContent)
  })

  test('Should serve a public asset with 200', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/public/assets/images/govuk-crest.svg'
    })

    expect(statusCode).toBe(statusCodes.ok)
  })
})
