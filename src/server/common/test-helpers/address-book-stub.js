import { listAddresses } from '../../app/services/address-book/index.js'

export const STUB_SEED_ADDRESS_NAME = 'Stub Farm 1'

export const listedStubNames = async (organisationId, query = {}) =>
  (
    await listAddresses(organisationId, {
      pageSize: 8,
      ...query
    })
  ).items.map(({ name }) => name)
