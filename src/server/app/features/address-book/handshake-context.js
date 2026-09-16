import Boom from '@hapi/boom'

import { isKnownJourneyType } from './journey-registry.js'

const SESSION_KEY = 'addressBookHandshake'

const queryValue = (request, name) => {
  const value = request.query[name]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : ''
}

const payloadValue = (payload, name) => {
  const value = payload?.[name]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : ''
}

const buildHandshakeContext = ({
  journeyType,
  notificationId,
  fulfilmentId,
  handshakeToken
}) => {
  if (!journeyType && !notificationId && !fulfilmentId && !handshakeToken) {
    return null
  }

  if (!journeyType || !notificationId || !fulfilmentId || !handshakeToken) {
    throw Boom.badRequest('Incomplete journey handshake')
  }

  if (!isKnownJourneyType(journeyType)) {
    throw Boom.notFound()
  }

  return {
    journeyType,
    notificationId,
    fulfilmentId,
    handshakeToken
  }
}

export const readHandshakeQuery = (request) =>
  buildHandshakeContext({
    journeyType: queryValue(request, 'journey-type'),
    notificationId: queryValue(request, 'notification-id'),
    fulfilmentId: queryValue(request, 'fulfilment-id'),
    handshakeToken: queryValue(request, 'handshake-token')
  })

export const storeHandshakeContext = (request, context) => {
  if (context) {
    request.yar.set(SESSION_KEY, context)
    return
  }
  request.yar.clear(SESSION_KEY)
}

export const loadHandshakeContext = (request) => request.yar.get(SESSION_KEY)

export const readHandshakePayload = (payload) =>
  buildHandshakeContext({
    journeyType: payloadValue(payload, 'journey-type'),
    notificationId: payloadValue(payload, 'notification-id'),
    fulfilmentId: payloadValue(payload, 'fulfilment-id'),
    handshakeToken: payloadValue(payload, 'handshake-token')
  })

const validatedSessionContext = (request) => {
  const fromSession = loadHandshakeContext(request)
  if (!fromSession) {
    return null
  }
  if (!isKnownJourneyType(fromSession.journeyType)) {
    storeHandshakeContext(request, null)
    return null
  }
  return fromSession
}

/**
 * The handshake a POST is acting on: the form's own hidden fields when they
 * are there, otherwise the one the GET stored. A journey type the registry no
 * longer knows is cleared rather than trusted.
 */
export const resolveHandshakeContext = (request) => {
  const fromPayload = readHandshakePayload(request.payload)
  if (fromPayload) {
    storeHandshakeContext(request, fromPayload)
    return fromPayload
  }
  return validatedSessionContext(request)
}

/**
 * Brings the session into line with the GET that is being served: a handshake
 * query starts one, and a plain visit to the page ends any that was running,
 * so a trader who navigates here themselves is not returned to a journey.
 */
export const syncHandshakeContext = (request) => {
  const fromQuery = readHandshakeQuery(request)
  if (fromQuery) {
    storeHandshakeContext(request, fromQuery)
    return fromQuery
  }
  storeHandshakeContext(request, null)
  return null
}
