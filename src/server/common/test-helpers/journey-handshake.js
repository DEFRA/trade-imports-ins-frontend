import { copy } from '../../app/features/address-book/copy/copy.en.js'
import { JOURNEY_TYPES } from '../../app/features/address-book/journey-registry.js'

const handshakeForFulfilmentId = (
  fulfilmentId,
  {
    journeyType = JOURNEY_TYPES.GBN_AG,
    notificationId = 'GBN-AG-26-4F7K2P'
  } = {}
) =>
  Object.freeze({
    'journey-type': journeyType,
    'notification-id': notificationId,
    'fulfilment-id': fulfilmentId,
    'handshake-token': 'handshake-token-value'
  })

export const JOURNEY_HANDSHAKES_BY_PARTY = Object.freeze({
  placeOfOrigin: handshakeForFulfilmentId(
    '89c0d1e2-f3a4-4b5f-8c0b-8d9e0f1a2b3c'
  ),
  consignor: handshakeForFulfilmentId('9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'),
  consignee: handshakeForFulfilmentId('abe2f3a4-b5c6-4d71-8e2d-af0a1b2c3d4e'),
  importer: handshakeForFulfilmentId('bcf3a4b5-c6d7-4e82-8f3e-ba1b2c3d4e5f'),
  placeOfDestination: handshakeForFulfilmentId(
    'cd04b5c6-d7e8-4f93-8a4f-cb2c3d4e5f60'
  )
})

const germinalProductsHandshakeForFulfilmentId = (fulfilmentId) =>
  handshakeForFulfilmentId(fulfilmentId, {
    journeyType: JOURNEY_TYPES.GBN_AG_GERMINAL_PRODUCTS,
    notificationId: 'GBN-AG-26-9K3M7Q'
  })

export const GERMINAL_PRODUCTS_JOURNEY_HANDSHAKES_BY_PARTY = Object.freeze({
  placeOfOrigin: germinalProductsHandshakeForFulfilmentId(
    '89c0d1e2-f3a4-4b5f-8c0b-8d9e0f1a2b3c'
  ),
  consignor: germinalProductsHandshakeForFulfilmentId(
    '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
  ),
  consignee: germinalProductsHandshakeForFulfilmentId(
    'abe2f3a4-b5c6-4d71-8e2d-af0a1b2c3d4e'
  ),
  importer: germinalProductsHandshakeForFulfilmentId(
    'bcf3a4b5-c6d7-4e82-8f3e-ba1b2c3d4e5f'
  ),
  placeOfDestination: germinalProductsHandshakeForFulfilmentId(
    'cd04b5c6-d7e8-4f93-8a4f-cb2c3d4e5f60'
  )
})

export const ROLES_BY_PARTY = Object.freeze({
  placeOfOrigin: {
    ownRole: 'PLACE_OF_ORIGIN',
    otherRoles: ['CONSIGNOR']
  },
  consignor: {
    ownRole: 'CONSIGNOR',
    otherRoles: ['PLACE_OF_ORIGIN']
  },
  consignee: {
    ownRole: 'CONSIGNEE',
    otherRoles: ['IMPORTER', 'PLACE_OF_DESTINATION']
  },
  importer: {
    ownRole: 'IMPORTER',
    otherRoles: ['CONSIGNEE', 'PLACE_OF_DESTINATION']
  },
  placeOfDestination: {
    ownRole: 'PLACE_OF_DESTINATION',
    otherRoles: ['CONSIGNEE', 'IMPORTER']
  }
})

export const journeyRolesHintFor = (party) =>
  copy.roles.journeyHint(
    copy.roles.options[ROLES_BY_PARTY[party].ownRole].label
  )

export const RECEIVING_PARTIES = Object.freeze([
  'consignee',
  'importer',
  'placeOfDestination'
])

export const SENDING_PARTIES = Object.freeze(['placeOfOrigin', 'consignor'])

export const ANIMALS_BASE_URL = 'http://localhost:3000'

const SET_BASE_BY_JOURNEY_TYPE = Object.freeze({
  [JOURNEY_TYPES.GBN_AG]: '/live-animals',
  [JOURNEY_TYPES.GBN_AG_GERMINAL_PRODUCTS]: '/germinal-products'
})

export const returnUrlFor = (handshake, { addressId, landing } = {}) => {
  const setBase = SET_BASE_BY_JOURNEY_TYPE[handshake['journey-type']]
  const url = new URL(
    `${ANIMALS_BASE_URL}${setBase}/notifications/${encodeURIComponent(handshake['notification-id'])}/address-return`
  )
  url.searchParams.set('fulfilment-id', handshake['fulfilment-id'])
  if (handshake['handshake-token']) {
    url.searchParams.set('handshake-token', handshake['handshake-token'])
  }
  if (addressId) {
    url.searchParams.set('addressId', addressId)
  }
  if (landing) {
    url.searchParams.set('landing', landing)
  }
  return url.href
}

export const handshakeContextOf = (handshake) => ({
  journeyType: handshake['journey-type'],
  notificationId: handshake['notification-id'],
  fulfilmentId: handshake['fulfilment-id'],
  handshakeToken: handshake['handshake-token']
})

export const UNREGISTERED_JOURNEY_TYPE = 'not-a-journey'

export const INCOMPLETE_HANDSHAKE_WARNING =
  'Journey handshake refused, it is missing an id or its token'
