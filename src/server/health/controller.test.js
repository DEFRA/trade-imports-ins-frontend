import { vi } from 'vitest'

import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-auth.js'
import {
  startTestServer,
  stopTestServer
} from '../common/test-helpers/test-server.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#healthController', () => {
  let server

  beforeAll(async () => {
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
