import { describe, expect, test, vi } from 'vitest'
import Boom from '@hapi/boom'

import { sessionKeys } from '#/server/common/constants/session-keys.js'
import {
  loadHandshakeContext,
  readHandshakePayload,
  readHandshakeQuery,
  resolveHandshakeContext,
  storeHandshakeContext,
  syncHandshakeContext
} from './handshake-context.js'

const validContext = {
  journeyType: 'gbn-ag',
  notificationId: 'GBN-AG-26-4F7K2P',
  fulfilmentId: '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
}

const mockRequest = (query = {}, payload = undefined, session = {}) => {
  const store = { ...session }
  return {
    query,
    payload,
    yar: {
      get: vi.fn((key) => store[key] ?? null),
      set: vi.fn((key, value) => {
        store[key] = value
      }),
      clear: vi.fn((key) => {
        delete store[key]
      })
    },
    sessionStore: store
  }
}

describe('readHandshakeQuery', () => {
  test('returns null when no handshake query params are present', () => {
    expect(readHandshakeQuery(mockRequest())).toBeNull()
  })

  test('throws when the handshake query is incomplete', () => {
    expect(() =>
      readHandshakeQuery(
        mockRequest({
          'journey-type': 'gbn-ag',
          'notification-id': 'GBN-AG-26-4F7K2P'
        })
      )
    ).toThrow(Boom.badRequest('Incomplete journey handshake'))
  })

  test('throws when the journey type is not registered', () => {
    expect(() =>
      readHandshakeQuery(
        mockRequest({
          'journey-type': 'not-a-journey',
          'notification-id': 'GBN-AG-26-4F7K2P',
          'fulfilment-id': validContext.fulfilmentId
        })
      )
    ).toThrow(Boom.notFound())
  })

  test('returns trimmed handshake context for a valid query', () => {
    expect(
      readHandshakeQuery(
        mockRequest({
          'journey-type': ' gbn-ag ',
          'notification-id': ' GBN-AG-26-4F7K2P ',
          'fulfilment-id': ` ${validContext.fulfilmentId} `
        })
      )
    ).toEqual(validContext)
  })
})

describe('readHandshakePayload', () => {
  test('returns null when no handshake payload fields are present', () => {
    expect(readHandshakePayload({ name: 'Farm' })).toBeNull()
  })

  test('throws when the handshake payload is incomplete', () => {
    expect(() =>
      readHandshakePayload({
        'journey-type': 'gbn-ag'
      })
    ).toThrow(Boom.badRequest('Incomplete journey handshake'))
  })

  test('throws when the journey type is not registered', () => {
    expect(() =>
      readHandshakePayload({
        'journey-type': 'not-a-journey',
        'notification-id': 'GBN-AG-26-4F7K2P',
        'fulfilment-id': validContext.fulfilmentId
      })
    ).toThrow(Boom.notFound())
  })

  test('returns trimmed handshake context for a valid payload', () => {
    expect(
      readHandshakePayload({
        'journey-type': ' gbn-ag ',
        'notification-id': ' GBN-AG-26-4F7K2P ',
        'fulfilment-id': ` ${validContext.fulfilmentId} `
      })
    ).toEqual(validContext)
  })
})

describe('storeHandshakeContext and loadHandshakeContext', () => {
  test('stores handshake context in the session', () => {
    const request = mockRequest()
    storeHandshakeContext(request, validContext)

    expect(request.yar.set).toHaveBeenCalledWith(
      sessionKeys.addressBookHandshake,
      validContext
    )
    expect(loadHandshakeContext(request)).toEqual(validContext)
  })

  test('clears handshake context from the session', () => {
    const request = mockRequest()
    storeHandshakeContext(request, validContext)
    storeHandshakeContext(request, null)

    expect(request.yar.clear).toHaveBeenCalledWith(
      sessionKeys.addressBookHandshake
    )
  })
})

describe('resolveHandshakeContext', () => {
  test('prefers handshake fields from the POST payload', () => {
    const request = mockRequest(
      {},
      {
        'journey-type': validContext.journeyType,
        'notification-id': validContext.notificationId,
        'fulfilment-id': validContext.fulfilmentId,
        name: 'Farm'
      }
    )

    expect(resolveHandshakeContext(request)).toEqual(validContext)
    expect(request.yar.set).toHaveBeenCalledWith(
      sessionKeys.addressBookHandshake,
      validContext
    )
  })

  test('falls back to the session when the payload carries no handshake fields', () => {
    const request = mockRequest(
      {},
      { name: 'Farm' },
      { [sessionKeys.addressBookHandshake]: validContext }
    )

    expect(resolveHandshakeContext(request)).toEqual(validContext)
  })

  test('clears and ignores a session whose journey type is no longer registered', () => {
    const request = mockRequest(
      {},
      { name: 'Farm' },
      {
        [sessionKeys.addressBookHandshake]: {
          ...validContext,
          journeyType: 'retired-journey'
        }
      }
    )

    expect(resolveHandshakeContext(request)).toBeNull()
    expect(request.yar.clear).toHaveBeenCalledWith(
      sessionKeys.addressBookHandshake
    )
  })
})

describe('syncHandshakeContext', () => {
  test('stores handshake context from the GET query', () => {
    const request = mockRequest({
      'journey-type': validContext.journeyType,
      'notification-id': validContext.notificationId,
      'fulfilment-id': validContext.fulfilmentId
    })

    expect(syncHandshakeContext(request)).toEqual(validContext)
    expect(request.yar.set).toHaveBeenCalledWith(
      sessionKeys.addressBookHandshake,
      validContext
    )
  })

  test('clears handshake context when the GET query is absent', () => {
    const request = mockRequest()

    expect(syncHandshakeContext(request)).toBeNull()
    expect(request.yar.clear).toHaveBeenCalledWith(
      sessionKeys.addressBookHandshake
    )
  })
})
