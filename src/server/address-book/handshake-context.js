import Boom from '@hapi/boom'

import { sessionKeys } from '#/server/common/constants/session-keys.js'
import {
  clearSessionValue,
  getSessionValue,
  setSessionValue
} from '#/server/common/helpers/session-helpers.js'
import { isKnownJourneyType } from './journey-registry.js'

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
    setSessionValue(request, sessionKeys.addressBookHandshake, context)
    return
  }
  clearSessionValue(request, sessionKeys.addressBookHandshake)
}

export const loadHandshakeContext = (request) =>
  getSessionValue(request, sessionKeys.addressBookHandshake)

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
