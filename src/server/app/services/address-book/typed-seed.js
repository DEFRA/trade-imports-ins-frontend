import { ROLES } from './address-types.js'

export const TYPED_SEED = Object.freeze({
  originAndConsignor: {
    name: 'Stub Origin Farm',
    roles: [ROLES.PLACE_OF_ORIGIN, ROLES.CONSIGNOR]
  },
  placeOfOrigin: {
    name: 'Stub Pasture Farm',
    roles: [ROLES.PLACE_OF_ORIGIN]
  },
  consigneeAndDestination: {
    name: 'Stub Consignee Farm',
    roles: [ROLES.CONSIGNEE, ROLES.PLACE_OF_DESTINATION]
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
