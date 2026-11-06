import {
  SET_BASES,
  SET_FRONTEND_BASE_URL_KEYS
} from '../../../common/constants/journey-set-bases.js'
import { buildSetBaseUrl } from '../../../common/helpers/set-base-url.js'
import {
  ROLES,
  ROLES_BY_ADDRESS_TYPE,
  addressTypeOfRole,
  addressTypeRequiresUnitedKingdom,
  keepRolesOfferedBy
} from '../../services/address-book/index.js'

export const JOURNEY_TYPES = Object.freeze({
  GBN_AG: 'gbn-ag'
})

export const ADDRESS_LANDING = Object.freeze({
  SELECT: 'select',
  RETURN: 'return',
  CANCEL: 'cancel'
})

export const CONSIGNMENT_CONTACT_FULFILMENT_ID =
  'f037e8f9-a0b1-4c26-8d72-fe5f60718293'

const RETURN_PATH_TEMPLATE =
  '/notifications/{notification-id}/address-return?fulfilment-id={fulfilment-id}'

const registry = Object.freeze({
  [JOURNEY_TYPES.GBN_AG]: {
    baseUrlConfigKey: SET_FRONTEND_BASE_URL_KEYS[SET_BASES.LIVE_ANIMALS],
    setBase: SET_BASES.LIVE_ANIMALS,
    returnPathTemplate: RETURN_PATH_TEMPLATE,
    consignmentContactFulfilmentId: CONSIGNMENT_CONTACT_FULFILMENT_ID,
    roleByPartyFulfilmentId: Object.freeze({
      '89c0d1e2-f3a4-4b5f-8c0b-8d9e0f1a2b3c': ROLES.PLACE_OF_ORIGIN,
      '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d': ROLES.CONSIGNOR,
      'abe2f3a4-b5c6-4d71-8e2d-af0a1b2c3d4e': ROLES.CONSIGNEE,
      'bcf3a4b5-c6d7-4e82-8f3e-ba1b2c3d4e5f': ROLES.IMPORTER,
      'cd04b5c6-d7e8-4f93-8a4f-cb2c3d4e5f60': ROLES.PLACE_OF_DESTINATION,
      [CONSIGNMENT_CONTACT_FULFILMENT_ID]: ROLES.BRANCH_ADDRESS
    })
  }
})

export const roleOfParty = (context) => {
  const roleByFulfilmentId =
    registry[context?.journeyType]?.roleByPartyFulfilmentId
  return roleByFulfilmentId &&
    Object.hasOwn(roleByFulfilmentId, context.fulfilmentId)
    ? roleByFulfilmentId[context.fulfilmentId]
    : undefined
}

export const isResolvableHandshake = (context) =>
  roleOfParty(context) !== undefined

export const isConsignmentContact = (context) => {
  const contactFulfilmentId =
    registry[context?.journeyType]?.consignmentContactFulfilmentId
  return (
    contactFulfilmentId !== undefined &&
    contactFulfilmentId === context?.fulfilmentId
  )
}

export const requiresUnitedKingdomAddress = (context) =>
  !isConsignmentContact(context) &&
  addressTypeRequiresUnitedKingdom(addressTypeOfRole(roleOfParty(context)))

export const ownAndOtherRolesOfParty = (context) => {
  const ownRole = roleOfParty(context)
  if (!ownRole) {
    return { otherRoles: [] }
  }
  return {
    ownRole,
    otherRoles: ROLES_BY_ADDRESS_TYPE[addressTypeOfRole(ownRole)].filter(
      (role) => role !== ownRole
    )
  }
}

export const rolesToSaveForParty = (context, postedRoles) => {
  const ownRole = roleOfParty(context)
  return keepRolesOfferedBy(addressTypeOfRole(ownRole), [
    ownRole,
    ...postedRoles
  ])
}

const assertHandshakeIds = (context) => {
  if (!context.notificationId || !context.fulfilmentId) {
    throw new Error(
      'Handshake context must include notificationId and fulfilmentId'
    )
  }
}

export const buildReturnUrl = (context, { addressId, landing } = {}) => {
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
  if (landing) {
    url.searchParams.set('landing', landing)
  }

  return url.href
}
