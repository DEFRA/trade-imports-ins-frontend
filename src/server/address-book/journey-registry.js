import { config } from '#/config/config.js'

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

export const buildReturnUrl = (context, { addressId } = {}) => {
  const entry = registry[context.journeyType]
  if (!entry) {
    throw new Error(`Unknown journey type "${context.journeyType}"`)
  }

  const baseUrl = config
    .get('tradeImportsAnimalsFrontend.baseUrl')
    .replace(/\/$/, '')
  let path = entry.returnPathTemplate
    .replace('{notification-id}', encodeURIComponent(context.notificationId))
    .replace('{fulfilment-id}', encodeURIComponent(context.fulfilmentId))

  if (addressId) {
    path += `&addressId=${encodeURIComponent(addressId)}`
  }

  return `${baseUrl}${path}`
}
