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

export const listAddresses = async (organisationId, { page = 1 } = {}) => {
  const pageSize = 25
  const addresses = addressesOf(organisationId)
  const totalItems = addresses.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const from = (page - 1) * pageSize

  return {
    items: addresses.slice(from, from + pageSize),
    page,
    pageSize,
    totalItems,
    totalPages
  }
}

export const createAddress = async (organisationId, address) => {
  const created = { id: newObjectId(), ...address }
  addressesOf(organisationId).push(created)
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
    (storedAddress) => storedAddress.id === addressId
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
    addresses.splice(index, 1)
  }
}
