import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'

const OBJECT_ID_LENGTH = 24

const addressesByOrganisation = new Map()

const newObjectId = () =>
  crypto.randomUUID().replaceAll('-', '').slice(0, OBJECT_ID_LENGTH)

const buildSeedAddress = (index) => ({
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
  deleted: false
})

const seedAddressesFor = (organisationId) => {
  if (organisationId.endsWith('-empty')) {
    return []
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

const matchesSearch = (address, { searchTerm, countryCodes = [] }) => {
  const term = searchTerm?.trim().toLowerCase()
  if (!term && countryCodes.length === 0) {
    return true
  }
  const searchedTextFields = [
    'name',
    'addressLine1',
    'addressLine2',
    'townOrCity',
    'county',
    'postcode'
  ]
  const textMatches =
    Boolean(term) &&
    searchedTextFields.some((field) =>
      (address[field] ?? '').toLowerCase().includes(term)
    )
  return textMatches || countryCodes.includes(address.countryCode)
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
  { page = 1, pageSize, ...search } = {}
) => {
  const matches = addressesOf(organisationId)
    .filter(isLive)
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
  if (index !== -1) {
    addresses[index] = { ...addresses[index], deleted: true }
  }
}
