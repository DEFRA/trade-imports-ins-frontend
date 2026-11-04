import { ADDRESS_TYPES, USES } from './address-types.js'

export const TYPED_SEED = Object.freeze({
  originAndConsignor: {
    name: 'Stub Origin Farm',
    addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
    uses: [USES.PLACE_OF_ORIGIN, USES.CONSIGNOR]
  },
  mixedOriginAndConsignee: {
    name: 'Stub Mixed Farm',
    addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
    uses: [USES.PLACE_OF_ORIGIN, USES.CONSIGNEE]
  },
  importer: {
    name: 'Stub Importer Farm',
    addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
    uses: [USES.IMPORTER]
  },
  branch: {
    name: 'Stub Branch Farm',
    addressType: ADDRESS_TYPES.BRANCH,
    uses: [USES.BRANCH_ADDRESS]
  },
  branchDepot: {
    name: 'Stub Branch Depot',
    addressType: ADDRESS_TYPES.BRANCH,
    uses: [USES.BRANCH_ADDRESS]
  }
})
