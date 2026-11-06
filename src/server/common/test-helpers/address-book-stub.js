import { listAddresses } from '../../app/services/address-book/index.js'
import { seedAddress } from '../../app/features/address-book/fit/seed-address.js'

export const STUB_SEED_ADDRESS_NAME = seedAddress.name

export const STUB_LIST_PAGE_SIZE = 8

export const listedStubNames = async (organisationId, query = {}) =>
  (
    await listAddresses(organisationId, {
      pageSize: STUB_LIST_PAGE_SIZE,
      ...query
    })
  ).items.map(({ name }) => name)
