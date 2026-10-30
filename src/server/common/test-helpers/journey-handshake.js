import { CONSIGNMENT_CONTACT_FULFILMENT_ID } from '../../app/features/address-book/journey-registry.js'

const handshakeForFulfilmentId = (fulfilmentId) =>
  Object.freeze({
    'journey-type': 'gbn-ag',
    'notification-id': 'GBN-AG-26-4F7K2P',
    'fulfilment-id': fulfilmentId,
    'handshake-token': 'handshake-token-value'
  })

export const JOURNEY_HANDSHAKES_BY_ROLE = Object.freeze({
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

export const UNITED_KINGDOM_ROLES = Object.freeze([
  'consignee',
  'importer',
  'placeOfDestination'
])

export const ANY_COUNTRY_ROLES = Object.freeze(['placeOfOrigin', 'consignor'])

export const CONSIGNMENT_CONTACT_HANDSHAKE = handshakeForFulfilmentId(
  CONSIGNMENT_CONTACT_FULFILMENT_ID
)

export const ANIMALS_BASE_URL = 'http://localhost:3000'

export const returnUrlFor = (handshake, { addressId, landing } = {}) => {
  const url = new URL(
    `${ANIMALS_BASE_URL}/live-animals/notifications/${encodeURIComponent(handshake['notification-id'])}/address-return`
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
