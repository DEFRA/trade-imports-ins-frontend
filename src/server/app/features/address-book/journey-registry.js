import { config } from '../../../../config/config.js'

export const JOURNEY_TYPES = Object.freeze({
  GBN_AG: 'gbn-ag'
})

const RETURN_PATH_TEMPLATE =
  '/notifications/{notification-id}/address-return?fulfilment-id={fulfilment-id}'

const registry = Object.freeze({
  [JOURNEY_TYPES.GBN_AG]: {
    returnPathTemplate: RETURN_PATH_TEMPLATE
  }
})

export const isKnownJourneyType = (journeyType) =>
  Object.hasOwn(registry, journeyType)

const assertHandshakeIds = (context) => {
  if (!context.notificationId || !context.fulfilmentId) {
    throw new Error(
      'Handshake context must include notificationId and fulfilmentId'
    )
  }
}

export const buildReturnUrl = (context, { addressId } = {}) => {
  const entry = registry[context.journeyType]
  if (!entry) {
    throw new Error(`Unknown journey type "${context.journeyType}"`)
  }

  assertHandshakeIds(context)

  const baseUrl = config
    .get('tradeImportsAnimalsFrontend.baseUrl')
    .replace(/\/$/, '')
  const path = entry.returnPathTemplate
    .replace('{notification-id}', encodeURIComponent(context.notificationId))
    .replace('{fulfilment-id}', encodeURIComponent(context.fulfilmentId))

  const url = new URL(path, baseUrl)
  if (context.handshakeToken) {
    url.searchParams.set('handshake-token', context.handshakeToken)
  }
  if (addressId) {
    url.searchParams.set('addressId', addressId)
  }

  return url.href
}
