import { isEmptySeedOrganisation } from '../stub-seed.js'
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import {
  OBJECT_ID_LENGTH,
  isLive,
  newObjectId,
  pageOfMatches,
  throwIfInvalid
} from '../stub-support.js'
import {
  ADDRESS_TYPES,
  ROLES,
  ROLES_BY_ADDRESS_TYPE,
  addressTypeOfRole
} from './address-types.js'
import { TYPED_SEED } from './typed-seed.js'

const addressesByOrganisation = new Map()

const buildSeedAddress = (index, details = {}) => ({
  id: String(index).padStart(OBJECT_ID_LENGTH, '0'),
  name: `Stub Farm ${index}`,
  addressLine1: `${index} Stub Way`,
  addressLine2: '',
  townOrCity: 'Stubton',
  county: '',
  postcode: 'ST1 1UB',
  countryCode: 'GB',
  email: `stub-farm-${index}@example.com`,
  phone: '01234567890',
  roles: [ROLES.PLACE_OF_ORIGIN, ROLES.CONSIGNOR],
  deleted: false,
  ...details
})

const typedSeedAddresses = () =>
  Object.values(TYPED_SEED).map((details, index) =>
    buildSeedAddress(index + 1, details)
  )

const seedAddressesFor = (organisationId) => {
  if (isEmptySeedOrganisation(organisationId)) {
    return []
  }
  if (organisationId.endsWith('-typed')) {
    return typedSeedAddresses()
  }
  if (organisationId.endsWith('-paginated')) {
    const paginatedSeedCount = 30
    return Array.from({ length: paginatedSeedCount }, (_, index) =>
      buildSeedAddress(index + 1)
    )
  }
  return [buildSeedAddress(1)]
}

const addressesOf = (organisationId) => {
  if (!addressesByOrganisation.has(organisationId)) {
    addressesByOrganisation.set(
      organisationId,
      seedAddressesFor(organisationId)
    )
  }
  return addressesByOrganisation.get(organisationId)
}

const notFound = () =>
  Object.assign(new Error('Not found'), { status: HTTP_STATUS_NOT_FOUND })

const holdsAnyOf = (address, roles) =>
  address.roles.some((role) => roles.includes(role))

const passesRoleFilter = (address, roles) =>
  roles.length === 0 || holdsAnyOf(address, roles)

const matchesSearch = (
  address,
  { searchTerm, countryCodes = [], searchRoles = [] }
) => {
  const term = searchTerm?.trim().toLowerCase()
  if (!term && countryCodes.length === 0 && searchRoles.length === 0) {
    return true
  }
  const textSearchFields = [
    'name',
    'addressLine1',
    'addressLine2',
    'townOrCity',
    'county',
    'postcode'
  ]
  const textMatches =
    Boolean(term) &&
    textSearchFields.some((field) =>
      (address[field] ?? '').toLowerCase().includes(term)
    )
  return (
    textMatches ||
    countryCodes.includes(address.countryCode) ||
    holdsAnyOf(address, searchRoles)
  )
}

export const listAddresses = async (
  organisationId,
  { page = 1, pageSize, roles = [], ...search } = {}
) => {
  const matches = addressesOf(organisationId)
    .filter(isLive)
    .filter((address) => passesRoleFilter(address, roles))
    .filter((address) => matchesSearch(address, search))
  return pageOfMatches(matches, { page, pageSize })
}

const RECEIVING_ROLES =
  ROLES_BY_ADDRESS_TYPE[ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER]

const refusalsOf = ({ roles = [], countryCode }) => {
  if (roles.length === 0) {
    return { roles: ['Select what this address can be used for'] }
  }
  if (new Set(roles.map(addressTypeOfRole)).size > 1) {
    return { roles: ['An address can only have roles from one group'] }
  }
  if (holdsAnyOf({ roles }, RECEIVING_ROLES) && countryCode !== 'GB') {
    return {
      countryCode: [
        'A consignee, importer or place of destination must be in the United Kingdom'
      ]
    }
  }
  return null
}

export const createAddress = async (organisationId, address) => {
  throwIfInvalid(refusalsOf(address))
  const created = { id: newObjectId(), ...address, deleted: false }
  addressesOf(organisationId).unshift(created)
  return created
}

export const getAddress = async (organisationId, addressId) => {
  const address = addressesOf(organisationId).find(
    (storedAddress) => storedAddress.id === addressId
  )
  if (!address) {
    throw notFound()
  }
  return address
}

export const updateAddress = async (organisationId, addressId, address) => {
  const addresses = addressesOf(organisationId)
  const index = addresses.findIndex(
    (storedAddress) => storedAddress.id === addressId && isLive(storedAddress)
  )
  if (index === -1) {
    throw notFound()
  }
  throwIfInvalid(refusalsOf(address))
  addresses[index] = { ...addresses[index], ...address }
  return addresses[index]
}

export const deleteAddress = async (organisationId, addressId) => {
  const addresses = addressesOf(organisationId)
  const index = addresses.findIndex((address) => address.id === addressId)
  if (index === -1) {
    throw notFound()
  }
  addresses[index] = { ...addresses[index], deleted: true }
}
