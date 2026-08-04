import { describe, expect, test, vi, beforeEach } from 'vitest'

import { getPermissions } from './get-permissions.js'

const wreckGetMock = vi.hoisted(() => vi.fn())
const configGetMock = vi.hoisted(() => vi.fn())
const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@hapi/wreck', () => ({
  default: { get: wreckGetMock }
}))

vi.mock('#/config/config.js', () => ({
  config: { get: configGetMock }
}))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

describe('getPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getTraceIdMock.mockReturnValue('trace-1')
    configGetMock.mockImplementation((key) => {
      if (key === 'tracing.header') return 'x-cdp-request-id'
      if (key === 'permissions.useMock') return false
      if (key === 'permissions.rpsBaseUrl') return 'https://rps.example.com'
      if (key === 'permissions.sitiAgriBaseUrl') {
        return 'https://siti.example.com'
      }
    })
  })

  test('loads role and scope from RPS and Siti Agri when mock is disabled', async () => {
    wreckGetMock
      .mockResolvedValueOnce({ payload: { _data: { id: 'person-42' } } })
      .mockResolvedValueOnce({
        payload: {
          data: {
            personRoles: [{ personId: 'person-42', role: 'Agent' }],
            personPrivileges: [
              { personId: 'person-42', privilegeNames: ['Submit - bps'] }
            ]
          }
        }
      })

    await expect(
      getPermissions('CRN123', 'org-1', 'token-abc')
    ).resolves.toEqual({
      role: 'Agent',
      scope: ['user', 'Submit - bps']
    })

    expect(wreckGetMock).toHaveBeenNthCalledWith(
      1,
      'https://rps.example.com/person/3337243/summary',
      expect.objectContaining({
        headers: {
          crn: 'CRN123',
          Authorization: 'token-abc',
          'x-cdp-request-id': 'trace-1'
        }
      })
    )
    expect(wreckGetMock).toHaveBeenNthCalledWith(
      2,
      'https://siti.example.com/SitiAgriApi/authorisation/organisation/org-1/authorisation',
      expect.any(Object)
    )
  })

  test('returns CRN-scoped mock permissions when useMock is enabled', async () => {
    configGetMock.mockImplementation((key) => {
      if (key === 'permissions.useMock') return true
    })

    await expect(
      getPermissions('CRN999', 'org-2', 'token-abc')
    ).resolves.toEqual({
      role: 'Importer',
      scope: ['user', 'Full permission - business']
    })

    expect(wreckGetMock).not.toHaveBeenCalled()
  })

  test('throws when live APIs are required but URLs are missing', async () => {
    configGetMock.mockImplementation((key) => {
      if (key === 'permissions.useMock') return false
      if (key === 'permissions.rpsBaseUrl') return null
      if (key === 'permissions.sitiAgriBaseUrl') return null
    })

    await expect(
      getPermissions('CRN123', 'org-1', 'token-abc')
    ).rejects.toThrow('Permissions API URLs are not configured')
  })

  test('throws when RPS API does not return a person id', async () => {
    wreckGetMock.mockResolvedValueOnce({ payload: { _data: {} } })

    await expect(
      getPermissions('CRN123', 'org-1', 'token-abc')
    ).rejects.toThrow('RPS API did not return a person id')
  })

  test('throws when Siti Agri API does not return a role for this user', async () => {
    wreckGetMock
      .mockResolvedValueOnce({ payload: { _data: { id: 'person-42' } } })
      .mockResolvedValueOnce({
        payload: {
          data: {
            personRoles: [],
            personPrivileges: []
          }
        }
      })

    await expect(
      getPermissions('CRN123', 'org-1', 'token-abc')
    ).rejects.toThrow('Siti Agri API did not return a role for this user')
  })
})
