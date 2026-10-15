export const ADDRESS_TYPES = Object.freeze([
  'ORIGIN_OR_CONSIGNOR',
  'DESTINATION_CONSIGNEE_OR_IMPORTER',
  'BRANCH'
])

export const isAddressType = (value) => ADDRESS_TYPES.includes(value)
