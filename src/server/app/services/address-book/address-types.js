export const ADDRESS_TYPES = Object.freeze({
  ORIGIN_OR_CONSIGNOR: 'ORIGIN_OR_CONSIGNOR',
  DESTINATION_CONSIGNEE_OR_IMPORTER: 'DESTINATION_CONSIGNEE_OR_IMPORTER',
  BRANCH: 'BRANCH'
})

export const USES_BY_ADDRESS_TYPE = Object.freeze({
  [ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR]: Object.freeze([
    'PLACE_OF_ORIGIN',
    'CONSIGNOR'
  ]),
  [ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER]: Object.freeze([
    'CONSIGNEE',
    'IMPORTER',
    'PLACE_OF_DESTINATION'
  ]),
  [ADDRESS_TYPES.BRANCH]: Object.freeze(['BRANCH_ADDRESS'])
})

export const addressTypeOfUse = (use) =>
  Object.values(ADDRESS_TYPES).find((addressType) =>
    USES_BY_ADDRESS_TYPE[addressType].includes(use)
  )

export const PLACE_USES = Object.freeze([
  'PLACE_OF_ORIGIN',
  'PLACE_OF_DESTINATION'
])

const UNITED_KINGDOM_ADDRESS_TYPES = Object.freeze([
  ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
  ADDRESS_TYPES.BRANCH
])

export const addressTypeRequiresUnitedKingdom = (addressType) =>
  UNITED_KINGDOM_ADDRESS_TYPES.includes(addressType)
