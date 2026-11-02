export const TYPED_SEED = Object.freeze({
  originAndConsignor: {
    name: 'Stub Origin Farm',
    uses: ['PLACE_OF_ORIGIN', 'CONSIGNOR']
  },
  mixedOriginAndConsignee: {
    name: 'Stub Mixed Farm',
    uses: ['PLACE_OF_ORIGIN', 'CONSIGNEE']
  },
  importer: { name: 'Stub Importer Farm', uses: ['IMPORTER'] },
  branch: { name: 'Stub Branch Farm', uses: ['BRANCH_ADDRESS'] },
  branchDepot: { name: 'Stub Branch Depot', uses: ['BRANCH_ADDRESS'] }
})
