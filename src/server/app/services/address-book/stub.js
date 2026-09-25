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

const seedAddressesFor = (orgId) => {
  if (orgId.endsWith('-empty')) {
    return []
  }
  if (orgId.endsWith('-paginated')) {
    return Array.from({ length: PAGINATED_SEED_COUNT }, (_, index) =>
      buildSeedAddress(index + 1)
    )
  }
  return [buildSeedAddress(1)]
}

const addressesOf = (orgId) => {
  if (!store.has(orgId)) {
    store.set(orgId, seedAddressesFor(orgId))
  }
  return store.get(orgId)
}

const notFound = () =>
  Object.assign(new Error('Not found'), { status: HTTP_STATUS_NOT_FOUND })

export const listAddresses = async (orgId, { page = 1 } = {}) => {
  const all = addressesOf(orgId)
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

export const createAddress = async (orgId, body) => {
  const created = { id: newObjectId(), ...body }
  addressesOf(orgId).push(created)
  return created
}

export const getAddress = async (orgId, id) => {
  const found = addressesOf(orgId).find((address) => address.id === id)
  if (!found) {
    throw notFound()
  }
  return found
}

export const updateAddress = async (orgId, id, body) => {
  const all = addressesOf(orgId)
  const index = all.findIndex((address) => address.id === id)
  if (index === -1) {
    throw notFound()
  }
  all[index] = { ...all[index], ...body }
  return all[index]
}

export const deleteAddress = async (orgId, id) => {
  const all = addressesOf(orgId)
  const index = all.findIndex((address) => address.id === id)
  if (index !== -1) {
    all.splice(index, 1)
  }
}
