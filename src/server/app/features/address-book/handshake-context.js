import Boom from '@hapi/boom'

import { trimmedField } from '../../../common/helpers/trimmed-field.js'
import { isKnownJourneyType } from './journey-registry.js'

const SESSION_KEY = 'addressBookHandshake'

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
    journeyType: trimmedField(request.query, 'journey-type'),
    notificationId: trimmedField(request.query, 'notification-id'),
    fulfilmentId: trimmedField(request.query, 'fulfilment-id'),
    handshakeToken: trimmedField(request.query, 'handshake-token')
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
    journeyType: trimmedField(payload, 'journey-type'),
    notificationId: trimmedField(payload, 'notification-id'),
    fulfilmentId: trimmedField(payload, 'fulfilment-id'),
    handshakeToken: trimmedField(payload, 'handshake-token')
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

export const resolveHandshakeContext = (request) => {
  const fromPayload = readHandshakePayload(request.payload)
  if (fromPayload) {
    storeHandshakeContext(request, fromPayload)
    return fromPayload
  }
  return validatedSessionContext(request)
}

export const syncHandshakeContext = (request) => {
  const fromQuery = readHandshakeQuery(request)
  if (fromQuery) {
    storeHandshakeContext(request, fromQuery)
    return fromQuery
  }
  storeHandshakeContext(request, null)
  return null
}
