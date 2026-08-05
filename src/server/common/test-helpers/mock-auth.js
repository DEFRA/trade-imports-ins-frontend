/**
 * @returns {import('@hapi/hapi').ServerInjectOptions['auth']}
 */
export function sessionAuth(sessionId, overrides = {}) {
  return {
    strategy: 'session',
    credentials: {
      sessionId,
      organisationId: '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88',
      name: 'Test User',
      email: 'test@example.com',
      token: 'mock-token',
      ...overrides
    }
  }
}

export const mockOidcConfig = {
  authorization_endpoint: 'https://mock-auth-server/dummy-authorize',
  token_endpoint: 'https://mock-auth-server/dummy-token',
  end_session_endpoint: 'https://mock-auth-server/dummy-logout',
  jwks_uri: 'https://mock-auth-server/dummy-jwks'
}
