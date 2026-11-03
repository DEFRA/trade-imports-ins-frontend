export const ORGANISATION_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'

/**
 * @returns {import('@hapi/hapi').ServerInjectOptions['auth']}
 */
export function sessionAuth(sessionId, overrides = {}) {
  return {
    strategy: 'session',
    credentials: {
      sessionId,
      organisationId: ORGANISATION_ID,
      name: 'Test User',
      email: 'test@example.com',
      token: 'mock-token',
      ...overrides
    }
  }
}
