import { describe, expect, test, vi } from 'vitest'
import Boom from '@hapi/boom'

import {
  loadHandshakeContext,
  readHandshakePayload,
  readHandshakeQuery,
  resolveHandshakeContext,
  storeHandshakeContext,
  syncHandshakeContext
} from './handshake-context.js'

const SESSION_KEY = 'addressBookHandshake'
const NOTIFICATION_ID = 'GBN-AG-26-4F7K2P'
const INCOMPLETE_HANDSHAKE_ERROR = 'Incomplete journey handshake'
const UNREGISTERED_JOURNEY_TYPE = 'not-a-journey'

const validContext = {
  journeyType: 'gbn-ag',
  notificationId: NOTIFICATION_ID,
  fulfilmentId: '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d',
  handshakeToken: 'handshake-token-value'
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
          'notification-id': NOTIFICATION_ID
        })
      )
    ).toThrow(Boom.badRequest(INCOMPLETE_HANDSHAKE_ERROR))
  })

  test('throws when the journey type is not registered', () => {
    expect(() =>
      readHandshakeQuery(
        mockRequest({
          'journey-type': UNREGISTERED_JOURNEY_TYPE,
          'notification-id': NOTIFICATION_ID,
          'fulfilment-id': validContext.fulfilmentId,
          'handshake-token': validContext.handshakeToken
        })
      )
    ).toThrow(Boom.notFound())
  })

  test('returns trimmed handshake context for a valid query', () => {
    expect(
      readHandshakeQuery(
        mockRequest({
          'journey-type': ' gbn-ag ',
          'notification-id': ` ${NOTIFICATION_ID} `,
          'fulfilment-id': ` ${validContext.fulfilmentId} `,
          'handshake-token': ` ${validContext.handshakeToken} `
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
    ).toThrow(Boom.badRequest(INCOMPLETE_HANDSHAKE_ERROR))
  })

  test('throws when the journey type is not registered', () => {
    expect(() =>
      readHandshakePayload({
        'journey-type': UNREGISTERED_JOURNEY_TYPE,
        'notification-id': NOTIFICATION_ID,
        'fulfilment-id': validContext.fulfilmentId,
        'handshake-token': validContext.handshakeToken
      })
    ).toThrow(Boom.notFound())
  })

  test('returns trimmed handshake context for a valid payload', () => {
    expect(
      readHandshakePayload({
        'journey-type': ' gbn-ag ',
        'notification-id': ` ${NOTIFICATION_ID} `,
        'fulfilment-id': ` ${validContext.fulfilmentId} `,
        'handshake-token': ` ${validContext.handshakeToken} `
      })
    ).toEqual(validContext)
  })
})

describe('storeHandshakeContext and loadHandshakeContext', () => {
  test('stores handshake context in the session', () => {
    const request = mockRequest()
    storeHandshakeContext(request, validContext)

    expect(request.yar.set).toHaveBeenCalledWith(SESSION_KEY, validContext)
    expect(loadHandshakeContext(request)).toEqual(validContext)
  })

  test('clears handshake context from the session', () => {
    const request = mockRequest()
    storeHandshakeContext(request, validContext)
    storeHandshakeContext(request, null)

    expect(request.yar.clear).toHaveBeenCalledWith(SESSION_KEY)
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
        'handshake-token': validContext.handshakeToken,
        name: 'Farm'
      }
    )

    expect(resolveHandshakeContext(request)).toEqual(validContext)
    expect(request.yar.set).toHaveBeenCalledWith(SESSION_KEY, validContext)
  })

  test('prefers the POST payload over a different session handshake', () => {
    const sessionContext = {
      journeyType: 'gbn-ag',
      notificationId: 'GBN-AG-26-OLDREF',
      fulfilmentId: '00000000-0000-4000-8000-000000000001',
      handshakeToken: 'old-token'
    }
    const request = mockRequest(
      {},
      {
        'journey-type': validContext.journeyType,
        'notification-id': validContext.notificationId,
        'fulfilment-id': validContext.fulfilmentId,
        'handshake-token': validContext.handshakeToken,
        name: 'Farm'
      },
      { [SESSION_KEY]: sessionContext }
    )

    expect(resolveHandshakeContext(request)).toEqual(validContext)
    expect(loadHandshakeContext(request)).toEqual(validContext)
  })

  test('throws when the POST payload handshake is incomplete', () => {
    const request = mockRequest({}, { 'journey-type': 'gbn-ag', name: 'Farm' })

    expect(() => resolveHandshakeContext(request)).toThrow(
      Boom.badRequest(INCOMPLETE_HANDSHAKE_ERROR)
    )
  })

  test('throws when the POST payload journey type is not registered', () => {
    const request = mockRequest(
      {},
      {
        'journey-type': UNREGISTERED_JOURNEY_TYPE,
        'notification-id': validContext.notificationId,
        'fulfilment-id': validContext.fulfilmentId,
        'handshake-token': validContext.handshakeToken,
        name: 'Farm'
      }
    )

    expect(() => resolveHandshakeContext(request)).toThrow(Boom.notFound())
  })

  test('falls back to the session when the payload carries no handshake fields', () => {
    const request = mockRequest(
      {},
      { name: 'Farm' },
      { [SESSION_KEY]: validContext }
    )

    expect(resolveHandshakeContext(request)).toEqual(validContext)
  })

  test('clears and ignores a session whose journey type is no longer registered', () => {
    const request = mockRequest(
      {},
      { name: 'Farm' },
      {
        [SESSION_KEY]: {
          ...validContext,
          journeyType: 'retired-journey'
        }
      }
    )

    expect(resolveHandshakeContext(request)).toBeNull()
    expect(request.yar.clear).toHaveBeenCalledWith(SESSION_KEY)
  })
})

describe('syncHandshakeContext', () => {
  test('stores handshake context from the GET query', () => {
    const request = mockRequest({
      'journey-type': validContext.journeyType,
      'notification-id': validContext.notificationId,
      'fulfilment-id': validContext.fulfilmentId,
      'handshake-token': validContext.handshakeToken
    })

    expect(syncHandshakeContext(request)).toEqual(validContext)
    expect(request.yar.set).toHaveBeenCalledWith(SESSION_KEY, validContext)
  })

  test('clears handshake context when the GET query is absent', () => {
    const request = mockRequest({}, undefined, {
      [SESSION_KEY]: validContext
    })

    expect(syncHandshakeContext(request)).toBeNull()
    expect(loadHandshakeContext(request)).toBeNull()
  })
})
