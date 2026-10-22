import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'

const PAGE_SIZE = 25
const PAGINATED_SEED_COUNT = 30

const OBJECT_ID_LENGTH = 24

const store = new Map()

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
    return Array.from({ length: PAGINATED_SEED_COUNT }, (_, index) =>
      buildSeedAddress(index + 1)
    )
  }
  return [buildSeedAddress(1)]
}

const addressesOf = (organisationId) => {
  if (!store.has(organisationId)) {
    store.set(organisationId, seedAddressesFor(organisationId))
  }
  return store.get(organisationId)
}

const notFound = () =>
  Object.assign(new Error('Not found'), { status: HTTP_STATUS_NOT_FOUND })

export const listAddresses = async (organisationId, { page = 1 } = {}) => {
  const all = addressesOf(organisationId)
  const totalItems = all.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const from = (page - 1) * PAGE_SIZE

  return {
    items: all.slice(from, from + PAGE_SIZE),
    page,
    pageSize: PAGE_SIZE,
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
  const found = addressesOf(organisationId).find(
    (address) => address.id === addressId
  )
  if (!found) {
    throw notFound()
  }
  return found
}

export const updateAddress = async (organisationId, addressId, address) => {
  const all = addressesOf(organisationId)
  const index = all.findIndex((stored) => stored.id === addressId)
  if (index === -1) {
    throw notFound()
  }
  all[index] = { ...all[index], ...address }
  return all[index]
}

export const deleteAddress = async (organisationId, addressId) => {
  const all = addressesOf(organisationId)
  const index = all.findIndex((address) => address.id === addressId)
  if (index !== -1) {
    all.splice(index, 1)
  }
}
