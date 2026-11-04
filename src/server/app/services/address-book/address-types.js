export const ADDRESS_TYPES = Object.freeze({
  ORIGIN_OR_CONSIGNOR: 'ORIGIN_OR_CONSIGNOR',
  DESTINATION_CONSIGNEE_OR_IMPORTER: 'DESTINATION_CONSIGNEE_OR_IMPORTER',
  BRANCH: 'BRANCH'
})

export const USES = Object.freeze({
  PLACE_OF_ORIGIN: 'PLACE_OF_ORIGIN',
  CONSIGNOR: 'CONSIGNOR',
  CONSIGNEE: 'CONSIGNEE',
  IMPORTER: 'IMPORTER',
  PLACE_OF_DESTINATION: 'PLACE_OF_DESTINATION',
  BRANCH_ADDRESS: 'BRANCH_ADDRESS'
})

export const USES_BY_ADDRESS_TYPE = Object.freeze({
  [ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR]: Object.freeze([
    USES.PLACE_OF_ORIGIN,
    USES.CONSIGNOR
  ]),
  [ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER]: Object.freeze([
    USES.CONSIGNEE,
    USES.IMPORTER,
    USES.PLACE_OF_DESTINATION
  ]),
  [ADDRESS_TYPES.BRANCH]: Object.freeze([USES.BRANCH_ADDRESS])
})

export const keepUsesOfferedBy = (addressType, candidateUses) =>
  USES_BY_ADDRESS_TYPE[addressType].filter((use) => candidateUses.includes(use))

export const addressTypeOfUse = (use) =>
  Object.values(ADDRESS_TYPES).find((addressType) =>
    USES_BY_ADDRESS_TYPE[addressType].includes(use)
  )

export const PLACE_USES = Object.freeze([
  USES.PLACE_OF_ORIGIN,
  USES.PLACE_OF_DESTINATION
])

export const addressTypeRequiresUnitedKingdom = (addressType) =>
  [
    ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
    ADDRESS_TYPES.BRANCH
  ].includes(addressType)
