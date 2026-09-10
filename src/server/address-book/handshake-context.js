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

export const readHandshakeQuery = (request) => {
  const journeyType = queryValue(request, 'journey-type')
  const notificationId = queryValue(request, 'notification-id')
  const fulfilmentId = queryValue(request, 'fulfilment-id')

  if (!journeyType && !notificationId && !fulfilmentId) {
    return null
  }

  if (!journeyType || !notificationId || !fulfilmentId) {
    throw Boom.badRequest('Incomplete journey handshake')
  }

  if (!isKnownJourneyType(journeyType)) {
    throw Boom.notFound()
  }

  return {
    journeyType,
    notificationId,
    fulfilmentId
  }
}

export const storeHandshakeContext = (request, context) => {
  if (context) {
    setSessionValue(request, sessionKeys.addressBookHandshake, context)
    return
  }
  clearSessionValue(request, sessionKeys.addressBookHandshake)
}

export const loadHandshakeContext = (request) =>
  getSessionValue(request, sessionKeys.addressBookHandshake)

const payloadValue = (payload, name) => {
  const value = payload?.[name]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : ''
}

export const readHandshakePayload = (payload) => {
  const journeyType = payloadValue(payload, 'journey-type')
  const notificationId = payloadValue(payload, 'notification-id')
  const fulfilmentId = payloadValue(payload, 'fulfilment-id')

  if (!journeyType && !notificationId && !fulfilmentId) {
    return null
  }

  if (!journeyType || !notificationId || !fulfilmentId) {
    throw Boom.badRequest('Incomplete journey handshake')
  }

  if (!isKnownJourneyType(journeyType)) {
    throw Boom.notFound()
  }

  return {
    journeyType,
    notificationId,
    fulfilmentId
  }
}

export const resolveHandshakeContext = (request) => {
  const fromPayload = readHandshakePayload(request.payload)
  if (fromPayload) {
    storeHandshakeContext(request, fromPayload)
    return fromPayload
  }
  return loadHandshakeContext(request)
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
