import { SET_BASES } from '#/server/common/constants/journey-set-bases.js'
import { buildSetBaseUrl } from '#/server/common/helpers/set-base-url.js'

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

  const returnPath = entry.returnPathTemplate
    .replace('{notification-id}', encodeURIComponent(context.notificationId))
    .replace('{fulfilment-id}', encodeURIComponent(context.fulfilmentId))

  // The journey frontend serves this journey's set under its own mount, not at
  // the root, so the return URL is the set base URL plus the template's path.
  const url = new URL(
    `${buildSetBaseUrl(entry.baseUrlConfigKey, entry.setBase)}${returnPath}`
  )
  if (context.handshakeToken) {
    url.searchParams.set('handshake-token', context.handshakeToken)
  }
  if (addressId) {
    url.searchParams.set('addressId', addressId)
  }

  return url.href
}
