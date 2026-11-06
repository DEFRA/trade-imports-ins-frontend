import { expectHealthy } from '../common/test-helpers/expect-healthy.js'
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

  test('Should answer GET /health with 200 and a success message', async () => {
    await expectHealthy(server)
  })
})
