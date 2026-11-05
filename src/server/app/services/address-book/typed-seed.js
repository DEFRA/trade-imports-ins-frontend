import { ROLES } from './address-types.js'

export const TYPED_SEED = Object.freeze({
  originAndConsignor: {
    name: 'Stub Origin Farm',
    roles: [ROLES.PLACE_OF_ORIGIN, ROLES.CONSIGNOR]
  },
  mixedOriginAndConsignee: {
    name: 'Stub Mixed Farm',
    roles: [ROLES.PLACE_OF_ORIGIN, ROLES.CONSIGNEE]
  },
  importer: {
    name: 'Stub Importer Farm',
    roles: [ROLES.IMPORTER]
  },
  branch: {
    name: 'Stub Branch Farm',
    roles: [ROLES.BRANCH_ADDRESS]
  },
  branchDepot: {
    name: 'Stub Branch Depot',
    roles: [ROLES.BRANCH_ADDRESS]
  }
})
