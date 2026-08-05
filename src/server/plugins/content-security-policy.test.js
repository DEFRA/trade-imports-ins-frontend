import { vi } from 'vitest'

import { createServer } from '#/server/server.js'
import {
  mockOidcConfig,
  sessionAuth
} from '#/server/common/test-helpers/mock-auth.js'

vi.mock('#/auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#contentSecurityPolicy', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should set the CSP policy header', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('csp-test')
    })

    expect(resp.headers['content-security-policy']).toBeDefined()
  })
})
