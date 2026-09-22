import { config } from '#/config/config.js'
import { SET_BASES } from '#/server/common/constants/journey-set-bases.js'

export const JOURNEY_TYPES = Object.freeze({
  GBN_AG: 'gbn-ag'
})

const RETURN_PATH_TEMPLATE =
  '/notifications/{notification-id}/address-return?fulfilment-id={fulfilment-id}'

const registry = Object.freeze({
  [JOURNEY_TYPES.GBN_AG]: {
    baseUrlConfigKey: 'tradeImportsAnimalsFrontend.baseUrl',
    setBase: SET_BASES.LIVE_ANIMALS,
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

  const baseUrl = config.get(entry.baseUrlConfigKey).replace(/\/$/, '')
  // The journey frontend serves this journey's set under its own mount, not at
  // the root, so the return path is the set base plus the template.
  const path = `${entry.setBase}${entry.returnPathTemplate
    .replace('{notification-id}', encodeURIComponent(context.notificationId))
    .replace('{fulfilment-id}', encodeURIComponent(context.fulfilmentId))}`

  const url = new URL(path, baseUrl)
  if (context.handshakeToken) {
    url.searchParams.set('handshake-token', context.handshakeToken)
  }
  if (addressId) {
    url.searchParams.set('addressId', addressId)
  }

  return url.href
}
