import { vi } from 'vitest'

import {
  recordTokenExchange,
  timeTokenExchange
} from './token-exchange-timer.js'
import { serviceSignInProvider } from './identity-providers.js'
import { readEmfDocuments } from '../server/common/test-helpers/emf-documents.js'

vi.mock('../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  })
}))

describe('token exchange timer', () => {
  let logSpy

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test.each([
    { isAuthenticated: true, expectedFailure: 0 },
    { isAuthenticated: false, expectedFailure: 1 }
  ])(
    'timeTokenExchange returns the token endpoint and recordTokenExchange emits the time since it, with failure $expectedFailure when isAuthenticated is $isAuthenticated',
    async ({ isAuthenticated, expectedFailure }) => {
      const request = { app: {}, auth: { isAuthenticated } }
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1250)

      const endpoint = timeTokenExchange('https://idp.example.com/token')(
        request
      )
      recordTokenExchange(request, serviceSignInProvider)

      expect(endpoint).toBe('https://idp.example.com/token')
      await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
      const [document] = readEmfDocuments(logSpy)
      expect(document.Dependency).toBe('defra-id')
      expect(document.Operation).toBe('token-exchange')
      expect(document.Interface).toBe('SYN-11')
      expect(document.ExternalCallDuration).toBe(250)
      expect(document.ExternalCallFailure).toBe(expectedFailure)
    }
  )

  test('recordTokenExchange emits nothing when Bell never reached the token call', async () => {
    recordTokenExchange(
      { app: {}, auth: { isAuthenticated: false } },
      serviceSignInProvider
    )
    const timedRequest = { app: {}, auth: { isAuthenticated: true } }
    timeTokenExchange('https://idp.example.com/token')(timedRequest)
    recordTokenExchange(timedRequest, serviceSignInProvider)

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    expect(readEmfDocuments(logSpy)).toEqual([
      expect.objectContaining({
        Operation: 'token-exchange',
        ExternalCallFailure: 0
      })
    ])
  })
})
