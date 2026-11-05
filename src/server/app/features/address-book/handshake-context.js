import Boom from '@hapi/boom'

import { createLogger } from '../../../common/helpers/logging/logger.js'
import { isResolvableHandshake } from './journey-registry.js'

const SESSION_KEY = 'addressBookHandshake'

const logger = createLogger()

const logHandshakeIds = (
  { journeyType, notificationId, fulfilmentId },
  message
) => {
  logger.warn({ journeyType, notificationId, fulfilmentId }, message)
}

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
    logHandshakeIds(
      { journeyType, notificationId, fulfilmentId },
      'Journey handshake refused, it is missing an id or its token'
    )
    throw Boom.badRequest('Incomplete journey handshake')
  }

  if (!isResolvableHandshake({ journeyType, fulfilmentId })) {
    logHandshakeIds(
      { journeyType, notificationId, fulfilmentId },
      'Journey handshake refused, the journey type or fulfilment id is not listed'
    )
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
  if (!isResolvableHandshake(fromSession)) {
    logHandshakeIds(
      fromSession,
      'Session journey handshake discarded, the journey type or fulfilment id is not listed'
    )
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
