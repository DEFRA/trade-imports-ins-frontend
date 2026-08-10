/**
 * In-memory stand-in for the real Address Book API, selected by runMode=stub
 * (see mode.js). No network call, no Mongo - deterministic per organisationId
 * so specs stay isolated from each other without any cross-process seeding.
 *
 * Org id convention (a spec picks which by signing in with ?organisationId=...):
 *   *-empty      -> starts with zero addresses
 *   *-paginated  -> starts with 30 addresses (two pages at the real page size)
 *   anything else -> starts with a single seed address
 */
const PAGE_SIZE = 25

const store = new Map()

function buildSeedAddress(index) {
  return {
    id: `stub-address-${index}`,
    name: `Stub Farm ${index}`,
    addressLine1: `${index} Stub Way`,
    addressLine2: '',
    townOrCity: 'Stubton',
    county: '',
    postcode: 'ST1 1UB',
    countryCode: 'GB'
  }
}

function seedFor(orgId) {
  if (store.has(orgId)) {
    return store.get(orgId)
  }

  const seeded = orgId.endsWith('-empty')
    ? []
    : orgId.endsWith('-paginated')
      ? Array.from({ length: 30 }, (_, i) => buildSeedAddress(i + 1))
      : [buildSeedAddress(1)]

  store.set(orgId, seeded)
  return seeded
}

function notFound() {
  const error = new Error('Not found')
  error.status = 404
  return error
}

export const addressBookClient = {
  async listAddresses(orgId, _traceId, { page = 1 } = {}) {
    const all = seedFor(orgId)
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
  },

  async createAddress(orgId, _traceId, body) {
    const all = seedFor(orgId)
    const created = { id: `stub-created-${crypto.randomUUID()}`, ...body }
    all.push(created)
    return created
  },

  async getAddress(orgId, _traceId, id) {
    const found = seedFor(orgId).find((address) => address.id === id)
    if (!found) {
      throw notFound()
    }
    return found
  },

  async updateAddress(orgId, _traceId, id, body) {
    const all = seedFor(orgId)
    const index = all.findIndex((address) => address.id === id)
    if (index === -1) {
      throw notFound()
    }
    all[index] = { ...all[index], ...body }
    return all[index]
  },

  async deleteAddress(orgId, _traceId, id) {
    const all = seedFor(orgId)
    const index = all.findIndex((address) => address.id === id)
    if (index !== -1) {
      all.splice(index, 1)
    }
  }
}
