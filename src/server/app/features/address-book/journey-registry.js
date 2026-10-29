import { SET_BASES } from '../../../common/constants/journey-set-bases.js'
import { buildSetBaseUrl } from '../../../common/helpers/set-base-url.js'

export const JOURNEY_TYPES = Object.freeze({
  GBN_AG: 'gbn-ag'
})

const RETURN_PATH_TEMPLATE =
  '/notifications/{notification-id}/address-return?fulfilment-id={fulfilment-id}'

const registry = Object.freeze({
  [JOURNEY_TYPES.GBN_AG]: {
    baseUrlConfigKey: 'tradeImportsAnimalsFrontend.baseUrl',
    setBase: SET_BASES.LIVE_ANIMALS,
    returnPathTemplate: RETURN_PATH_TEMPLATE,
    unitedKingdomFulfilmentIds: Object.freeze({
      consignee: 'abe2f3a4-b5c6-4d71-8e2d-af0a1b2c3d4e',
      importer: 'bcf3a4b5-c6d7-4e82-8f3e-ba1b2c3d4e5f',
      placeOfDestination: 'cd04b5c6-d7e8-4f93-8a4f-cb2c3d4e5f60'
    })
  }
})

export const isKnownJourneyType = (journeyType) =>
  Object.hasOwn(registry, journeyType)

export const requiresUnitedKingdomAddress = (context) =>
  Object.values(
    registry[context?.journeyType]?.unitedKingdomFulfilmentIds ?? {}
  ).includes(context?.fulfilmentId)

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
