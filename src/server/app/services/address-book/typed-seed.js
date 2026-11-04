import { USES } from './address-types.js'

export const TYPED_SEED = Object.freeze({
  originAndConsignor: {
    name: 'Stub Origin Farm',
    uses: [USES.PLACE_OF_ORIGIN, USES.CONSIGNOR]
  },
  mixedOriginAndConsignee: {
    name: 'Stub Mixed Farm',
    uses: [USES.PLACE_OF_ORIGIN, USES.CONSIGNEE]
  },
  importer: { name: 'Stub Importer Farm', uses: [USES.IMPORTER] },
  branch: { name: 'Stub Branch Farm', uses: [USES.BRANCH_ADDRESS] },
  branchDepot: { name: 'Stub Branch Depot', uses: [USES.BRANCH_ADDRESS] }
})
