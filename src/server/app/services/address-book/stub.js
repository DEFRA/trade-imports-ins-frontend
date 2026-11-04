import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import { ADDRESS_TYPES, USES_BY_ADDRESS_TYPE } from './address-types.js'
import { TYPED_SEED } from './typed-seed.js'

const OBJECT_ID_LENGTH = 24

const addressesByOrganisation = new Map()

const newObjectId = () =>
  crypto.randomUUID().replaceAll('-', '').slice(0, OBJECT_ID_LENGTH)

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
  deleted: false,
  ...details
})

const typedSeedAddresses = () =>
  Object.values(TYPED_SEED).map((details, index) =>
    buildSeedAddress(index + 1, details)
  )

const seedAddressesFor = (organisationId) => {
  if (organisationId.endsWith('-empty')) {
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

const isLive = (address) => !address.deleted

const isListedUnder = (address, category) => {
  if (!category) {
    return true
  }
  const uses = address.uses ?? []
  if (uses.length === 0) {
    return category === ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR
  }
  const usesListed = USES_BY_ADDRESS_TYPE[category] ?? []
  return uses.some((use) => usesListed.includes(use))
}

const holdsUse = (address, use) => !use || (address.uses ?? []).includes(use)

const matchesSearch = (
  address,
  { searchTerm, countryCodes = [], searchUses = [] }
) => {
  const term = searchTerm?.trim().toLowerCase()
  if (!term && countryCodes.length === 0 && searchUses.length === 0) {
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
    (address.uses ?? []).some((use) => searchUses.includes(use))
  )
}

const pageOfMatches = (matches, { page, pageSize }) => ({
  items: matches.slice((page - 1) * pageSize, page * pageSize),
  page,
  pageSize,
  totalItems: matches.length,
  totalPages: Math.ceil(matches.length / pageSize)
})

export const listAddresses = async (
  organisationId,
  { page = 1, pageSize, category, use, ...search } = {}
) => {
  const matches = addressesOf(organisationId)
    .filter(isLive)
    .filter((address) => isListedUnder(address, category))
    .filter((address) => holdsUse(address, use))
    .filter((address) => matchesSearch(address, search))
  return pageOfMatches(matches, { page, pageSize })
}

export const createAddress = async (organisationId, address) => {
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
