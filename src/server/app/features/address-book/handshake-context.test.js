import { describe, expect, test } from 'vitest'
import Boom from '@hapi/boom'

import { JOURNEY_HANDSHAKES_BY_ROLE } from '../../../common/test-helpers/journey-handshake.js'
import {
  loadHandshakeContext,
  readHandshakePayload,
  readHandshakeQuery,
  resolveHandshakeContext,
  storeHandshakeContext,
  syncHandshakeContext
} from './handshake-context.js'

const SESSION_KEY = 'addressBookHandshake'
const CONSIGNOR_HANDSHAKE = JOURNEY_HANDSHAKES_BY_ROLE.consignor
const PADDED_CONSIGNOR_HANDSHAKE = Object.fromEntries(
  Object.entries(CONSIGNOR_HANDSHAKE).map(([field, value]) => [
    field,
    ` ${value} `
  ])
)
const INCOMPLETE_HANDSHAKE_ERROR = 'Incomplete journey handshake'
const UNREGISTERED_JOURNEY_TYPE = 'not-a-journey'

const validContext = {
  journeyType: CONSIGNOR_HANDSHAKE['journey-type'],
  notificationId: CONSIGNOR_HANDSHAKE['notification-id'],
  fulfilmentId: CONSIGNOR_HANDSHAKE['fulfilment-id'],
  handshakeToken: CONSIGNOR_HANDSHAKE['handshake-token']
}

const mockRequest = (query = {}, payload = undefined, session = {}) => {
  const store = { ...session }
  return {
    query,
    payload,
    yar: {
      get: (key) => store[key] ?? null,
      set: (key, value) => {
        store[key] = value
      },
      clear: (key) => {
        delete store[key]
      }
    }
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
          'journey-type': CONSIGNOR_HANDSHAKE['journey-type'],
          'notification-id': CONSIGNOR_HANDSHAKE['notification-id']
        })
      )
    ).toThrow(Boom.badRequest(INCOMPLETE_HANDSHAKE_ERROR))
  })

  test('throws when the journey type is not registered', () => {
    expect(() =>
      readHandshakeQuery(
        mockRequest({
          ...CONSIGNOR_HANDSHAKE,
          'journey-type': UNREGISTERED_JOURNEY_TYPE
        })
      )
    ).toThrow(Boom.notFound())
  })

  test('returns trimmed handshake context for a valid query', () => {
    expect(
      readHandshakeQuery(mockRequest({ ...PADDED_CONSIGNOR_HANDSHAKE }))
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
        'journey-type': CONSIGNOR_HANDSHAKE['journey-type']
      })
    ).toThrow(Boom.badRequest(INCOMPLETE_HANDSHAKE_ERROR))
  })

  test('throws when the journey type is not registered', () => {
    expect(() =>
      readHandshakePayload({
        ...CONSIGNOR_HANDSHAKE,
        'journey-type': UNREGISTERED_JOURNEY_TYPE
      })
    ).toThrow(Boom.notFound())
  })

  test('returns trimmed handshake context for a valid payload', () => {
    expect(readHandshakePayload({ ...PADDED_CONSIGNOR_HANDSHAKE })).toEqual(
      validContext
    )
  })
})

describe('storeHandshakeContext and loadHandshakeContext', () => {
  test('stores handshake context in the session', () => {
    const request = mockRequest()
    storeHandshakeContext(request, validContext)

    expect(loadHandshakeContext(request)).toEqual(validContext)
  })

  test('clears handshake context from the session', () => {
    const request = mockRequest()
    storeHandshakeContext(request, validContext)
    storeHandshakeContext(request, null)

    expect(loadHandshakeContext(request)).toBeNull()
  })
})

describe('resolveHandshakeContext', () => {
  test('returns and stores the handshake from the POST payload', () => {
    const request = mockRequest({}, { ...CONSIGNOR_HANDSHAKE, name: 'Farm' })

    expect(resolveHandshakeContext(request)).toEqual(validContext)
    expect(loadHandshakeContext(request)).toEqual(validContext)
  })

  test('prefers the POST payload over a different session handshake', () => {
    const sessionContext = {
      journeyType: CONSIGNOR_HANDSHAKE['journey-type'],
      notificationId: 'GBN-AG-26-OLDREF',
      fulfilmentId: '00000000-0000-4000-8000-000000000001',
      handshakeToken: 'old-token'
    }
    const request = mockRequest(
      {},
      { ...CONSIGNOR_HANDSHAKE, name: 'Farm' },
      { [SESSION_KEY]: sessionContext }
    )

    expect(resolveHandshakeContext(request)).toEqual(validContext)
    expect(loadHandshakeContext(request)).toEqual(validContext)
  })

  test('throws when the POST payload handshake is incomplete', () => {
    const request = mockRequest(
      {},
      { 'journey-type': CONSIGNOR_HANDSHAKE['journey-type'], name: 'Farm' }
    )

    expect(() => resolveHandshakeContext(request)).toThrow(
      Boom.badRequest(INCOMPLETE_HANDSHAKE_ERROR)
    )
  })

  test('throws when the POST payload journey type is not registered', () => {
    const request = mockRequest(
      {},
      {
        ...CONSIGNOR_HANDSHAKE,
        'journey-type': UNREGISTERED_JOURNEY_TYPE,
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
    expect(loadHandshakeContext(request)).toBeNull()
  })
})

describe('syncHandshakeContext', () => {
  test('stores handshake context from the GET query', () => {
    const request = mockRequest({ ...CONSIGNOR_HANDSHAKE })

    expect(syncHandshakeContext(request)).toEqual(validContext)
    expect(loadHandshakeContext(request)).toEqual(validContext)
  })

  test('clears handshake context when the GET query is absent', () => {
    const request = mockRequest({}, undefined, {
      [SESSION_KEY]: validContext
    })

    expect(syncHandshakeContext(request)).toBeNull()
    expect(loadHandshakeContext(request)).toBeNull()
  })
})
